'use strict';

console.log("Loading");

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

var recordings_dict = {};

// Way to make it dry: get the base url and append the string associated + .mp3
var tuner_url_dict = {
    "A flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Gsharp4.mp3",
    "A": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/A4.mp3",
    "A sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Asharp4.mp3",
    "B flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Asharp4.mp3",
    "B": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/B4.mp3",
    "C": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/C4.mp3",
    "C sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/C4.mp3",
    "D flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Csharp4.mp3",
    "D": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/D4.mp3",
    "D sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Dsharp4.mp3",
    "E flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Dsharp4.mp3",
    "E": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/E4.mp3",
    "F": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/F4.mp3",
    "F sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Fsharp4.mp3",
    "G flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Fsharp4.mp3",
    "G": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/G4.mp3",
    "G sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Gsharp4.mp3",
};

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);
        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
		if (event.session.application.applicationId !== " amzn1.ask.skill.84e7e330-f816-4192-a826-6bf4c87279a0") {
            context.fail("Invalid Application ID");
        }
		
        var params = {
            TableName: "Recordings"
		};

        // adapted code from piazza post
        dynamo.scan(params, function(err, data) {
            if (err) {
                console.log("Failed to get data", err);
            }
            for (var item in data.Items) {
                item = data.Items[item];
                const name = item['RecordingName'].toLowerCase();
                recordings_dict[name] = item;
            }
        });

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        } else if (event.request == null) {
            handleBlankRequest(
            function callback(sessionAttributes, speechletResponse) {
                context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
            }



    } catch (e) {
        context.fail("Exception: " + e);
    }
};


/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    }

    else if (session.attributes && session.attributes.isTuning) {
        handleTuningDialogRequest(intent, session, callback);
    } else if (session.attributes && session.attributes.isRecording) {
        handleRecordingRequest(intent, session, callback);
	} else if (session.attributes && session.attributes.isRecordingList) {
        handleRecordingListRequest(intent, session, callback);	
	} else if (session.attributes && session.attributes.isMetronome) {
        handleMetronomeRequest(intent, session, callback);
    } else if ("SelectTaskIntent" === intentName) {
		handleMainMenuRequest(intent, session, callback)
	} else if ("AMAZON.StopIntent" === intentName) { // quit if at main menu (implied from not being in any current dialog)
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

// ------- Skill specific business logic -------

var CARD_TITLE = "Music Assistant";

function getWelcomeResponse(callback) {
    var sessionAttributes = {},
        speechOutput = "Music Assistant, what recipe would you like to make?",
        shouldEndSession = false,
        repromptText = "What else can I help you with?";

    sessionAttributes = {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
    };
    callback(sessionAttributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleBlankRequest(callback) { //Could have specific hints for blank responses depending on dialog, would be eh to implement. Thoughts?
    var sessionAttributes = {},
            speechOutput = "I'm sorry, I couldn't hear that.",
            shouldEndSession = false,
            repromptText = "How can I help you?";

        sessionAttributes = {
            "speechOutput": speechOutput,
            "repromptText": repromptText,
        };
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
    }

function handleMainMenuRequest(intent, session, callback) {
    // Parses initial task request to go into metronome, tuner, or recording task
	/* Should we have separate intents for the three tasks? Make it analagous here with 3 cases //make Matthew explain
    if ("SelectKnownDessertRecipeIntent" === intent.name) {
        var item = intent.slots.DessertRecipe.value;
    } else {
        var item = intent.slots.FoodRecipe.value;
    }
	*/
	
	if ("SelectTaskIntent" === intent.name) {
		//3 tasks possible
		var task = intent.slots.utteredTask.value;
		if (task === "tuner") {
			session.attributes.isTuning = true;
			session.attributes.isRecording = false;
			session.attributes.isMetronome = false;
			handleTuningDialogRequest(intent, session, callback);
		} else if (task === "metronome") {
			session.attributes.isTuning = false;
			session.attributes.isRecording = false;
			session.attributes.isMetronome = true;
			handleMetronomeRequest(intent, session, callback);
		} else if (task === "record" || task === "recording") {
			session.attributes.isTuning = false;
			session.attributes.isRecording = true;
			session.attributes.isMetronome = false;
			handleRecordingRequest(intent, session, callback);
		}
	}
	else {
		var reprompt = session.attributes.repromptText,
            speechOutput = "Oops I don't think you're supposed to be here, what task would you like help with?" + reprompt;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
	}

	/* HELPFUL JSON PARSING + LOGIC FOR RECORD
    var recording = recordings_dict[item.toLowerCase()]; //recording

    if (recording) {
        JSON.stringify(recording);
        //session.attributes.isRecipeDialog = true; //equiv would be a flag for which task we're in? do we want 3 boolean flags or one text flag ("none", "metronome", "record", "tuner")
        session.attributes.isRecording = true;
		session.attributes.recording = item;

        //session.attributes.ingredients = recipe["Ingredients"].split("\n"); //still have to split recordings
        //session.attributes.directions = recipe["Directions"].split("\n");

        //console.log("Ingredients", session.attributes.ingredients);
        //console.log("Directions", session.attributes.directions);

        session.attributes.index = -1;
        // will be used to signify that the user is going through the ingredients list
		
		
        //session.attributes.isIngredientsList = false;
        
		var reprompt = session.attributes.repromptText,
            speechOutput = "I found the recording called "
                + item + " . "
                + "Would you like to listen to it now? ";
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
    } else {
        var reprompt = session.attributes.repromptText,
            speechOutput = "I do not believe I have your recording called " + item + ". " + reprompt;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
    }
	
	*/
}

function handleTuningDialogRequest(intent, session, callback) {
    //Handles Tuning Dialog
	//User can:
	// - Back out into the main menu
	// - Start with standard guitar tuning EADGBE -- actually nixing this would be easier
	// - Manually choose each note they would like to tune to
	
	var speechOutput = ""

    if ("AMAZON.StopIntent" === intent.name) {
        // Back out into the main menu
        speechOutput += session.attributes.speechOutput;
        
		
		delete session.attributes.isMetronome;
		delete session.attributes.isTuning;
		delete session.attributes.isRecording;
		delete session.attributes.utteredTask;
		delete session.attributes.utteredNote;
		delete session.attributes.utteredSpeed;
		delete session.attributes.utteredRec;
		
	
    } else if ("SelectNoteIntent" === intent.name) {
        // Jump right into that particular note
		var note = session.attributes.utteredNote.value;
        url = tuner_url_dict[note];
        str = "<speak> Okay, here's  " + note + ". You will hear it twice. <break time='2s'/>"
                + "<audio src=\"" + url + "\"> <break time='1s'/> <audio src=\"" + url + "\"> </speak>";
        outputSpeech: {
            "type": "SSML",
            "ssml": str
        }
			//add notes into speechOutput with SSML
			
    } else { //might not necessarily have to be reprompt
        var reprompt = session.attributes.repromptText,
            speechOutput = "Sorry, what note would you like to tune to?" + reprompt;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
	}
	

    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}
		/*// Check if user has just stated they wanted to go through ingredients
        if ("GetIngredientsIntent" === intent.name && !session.attributes.isIngredientsList) {
            speechOutput += "I'll go through the ingredients list. "
                + "Please say next to go through the list or say 'what can I do?' for further assistance. "
            session.attributes.isIngredientsList = true;
        } else {
            // Progress through the list based on response
            var sample = -1;
            if ("GetIngredientsIntent" === intent.name) { // if they say get ingredients intent, treat like "next" intent
                sample = getIndex("AMAZON.NextIntent", session.attributes.index, session.attributes.ingredients.length);
            } else {
                sample = getIndex(intent.name, session.attributes.index, session.attributes.ingredients.length);
            }
            if (sample < session.attributes.ingredients.length) {
                //  Adds the ingredient to the output here
                speechOutput += session.attributes.ingredients[sample];
                session.attributes.index = sample;
            } else {
                // if we are at the end, we tell the user we are moving on
                speechOutput += "Now, I'll read off steps from the recipe. "
                    + "Please say next to go through the list or say 'what can I do?' for further assistance. ";
                delete session.attributes.isRecipeDialog;
                delete session.attributes.isIngredientsList;
                delete session.attributes.ingredients;
                session.attributes.index = -1;
                session.attributes.isRecipeDirectionsDialog = true;
                session.attributes.isRecipeList = true;
            }
        }
		*/
		
		//^^^ Helpful for going through a list, not really applicable here
		
		

function handleRecordingRequest(intent, session, callback) {
    // Handles all intents in the Recording Dialog
    // User can: 
    // - Back out to main menu
    // - Look for a specific recording title
	// - Go through the list of recordings one by one, calls handleRecordingListRequest
    //   * If the user goes forward at the end, let them know there is no more recordings.
    //   * If the user goes backwards at the beginning, just repeat the first recording's title.
	// - Play a recording once found
	
	var speechOutput = ""
	
	if ("AMAZON.StopIntent" === intent.name) {
        // Back out into the main menu
        speechOutput += session.attributes.speechOutput;
        delete session.attributes.isMetronome;
		delete session.attributes.isTuning;
		delete session.attributes.isRecording;
		delete	sessions.attributes.isRecordingList;
		delete sessions.attributes.index;
		delete session.attributes.utteredTask;
		delete session.attributes.utteredNote;
		delete session.attributes.utteredSpeed;
		delete session.attributes.utteredRec;
    } else if ("GetRecordingListIntent" === intent.name) {
		sessions.attributes.isRecordingList = true;
	} else if ("SelectRecIntent" === intent.name && session.attributes.utteredRec) {
		//try to find selected song in table of recordings pulled from earlier
		var recording = session.attributes.utteredRec.value;
		
		var audio = recordings[recording.toLowerCase()];
		
		if audio {
			//play that audio!
		}
		else {
			var reprompt = session.attributes.repromptText;
            speechOutput = "I do not believe I have a recording called " + recording + ". " + reprompt;
			callback(session.attributes,
				buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
		}
	}
	//add to speech output ^^^
	callback(session.attributes,
				buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
	}

/*		
function handleRecordingListeningRequest(intent, session, callback) {
	//Handles the actual playing of a particular recording
	
}		
*/
	
function handleRecordingListRequest(intent, session, callback) {
    // Handles walking through the list of recordings
    // User can: 
	// - Go through the list of recordings one by one, calls handleRecordingListRequest
    //   * If the user goes forward at the end, let them know there is no more recordings.
    //   * If the user goes backwards at the beginning, just repeat the first recording's title.
	// - Play a recording once found

    var speechOutput = ""

    if ("AMAZON.StopIntent" === intent.name) {
        // Back out into the main menu
        speechOutput += session.attributes.speechOutput;
        delete session.attributes.isMetronome;
		delete session.attributes.isTuning;
		delete session.attributes.isRecording;
		delete session.attributes.utteredTask;
		delete session.attributes.utteredNote;
		delete session.attributes.utteredSpeed;
		delete session.attributes.utteredRec;
		delete session.attributes.index;
	} else {
        if ("GetRecordingListIntent" === intent.name && !session.attributes.isRecordingList) {
            speechOutput += "I'll go through your recordings, for each file you can decide if you want to listen to it or go to the next file."
            session.attributes.isRecordingList = true;
        } else {
            // Progress through the list based on response
            var sample = -1;
            if ("GetRecordingListIntent" === intent.name) { // if they say get recording intent, treat like "next" intent
                sample = getIndex("AMAZON.NextIntent", session.attributes.index, session.attributes.recordings.length);
            } else if ("SelectRecIntent" === intent.name) {
				if (session.attributes.utteredRec) {
					//play the recording they said to
				}
				else {
					//play the recording we are at right now in the list
					var recording = recordings[] 
				}
			} else {
                sample = getIndex(intent.name, session.attributes.index, session.attributes.recordings.length); 
            }
            var index = session.attributes.index; //will have to add this as an attribute everywhere
            if (sample < session.attributes.recordings.length) {
                speechOutput += session.attributes.directions[sample];
                session.attributes.index = sample;
            } else {
                speechOutput += "You have no more recording files "
                    + "You can go back to the beginning of the list by saying 'start over'. "
                    + "If you are done, you may quit. ";
            }      
        }
    }

    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}

//TO DO MetronomeHandler
function handleMetronomeRequest(intent, session, callback) {}

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining possible responses.
    // Output varies on session.attributes
    var speechOutput = "",
        repromptText = "",
        shouldEndSession = false;
    if (session.attributes.isTuning) {
        speechOutput = "When tuning, you can have me play any note so you can hear it and adjust your instrument as needed."
            + "To do this, you can say 'Tune to the key of G,' for example. "
			+ "I will play the note for you twice, and you can either listen to the same note, choose a new one, or quit tuning"
           // + "You can say next or previous to have me read off the next or previous note in standard tuning. "
            // + "I can also start over from the stop if needed when you say 'start again'. "
    } else if (session.attributes.isMetronome) {
        speechOutput = "With the metronome, I can keep time in any tempo from 50 to 200 beats per minute. "
            + "You can say 'play at 100 bpm', for example, to change the speed."
            + "100bpm is the default setting"
            + "You may also choose the time signature by saying 'play in 4 4 time' which is the default time signature"
            + "You may also choose to have no time signature so all notes sound the same."
			+ "You may stop the metronome with 'stop' and resume or change your settings at any time";
    } else if (session.attributes.isRecording) {
        speechOutput = "Here, we can listen to your previous recordings "
            + "You can say 'Find Blue Song' to find your recording titled 'Blue Song'"
            + "If I have your recording, I will play it for you"
            + "If your unsure of the recording title, I will ask you if you want to go through the list of your recordings."
			+ "For each recording in your saved recordings, I will tell you the name and you will have the option to 'listen' to it or go to the 'next' or 'previous' recording"
			+ "You may 'pause', 'play', 'restart', or 'stop' your recording at any time.";
    }else {
        speechOutput = "You can tune your instrument, use a metronome to practice, or listen to your recordings" //If user just says help in the main menu?
            + "For example you can say, 'I'd like to tune in the key of G.'";
        }
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, speechOutput, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session if the user wants to quit
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Have a good day!", "", true));
}

// ------- Helper functions to build responses -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

// ------- Additional Helper Functions --------
function getIndex(intentName, index, maxLength) {
    // Helper function to get an index
    // Index can go forward 1, backwards 1, to the end (maxLength - 1), or the beginning (0)

    // Note, I think that Next / Prev Intents would be matched if they said "Next ingredient", NLP is beautiful
    // But if not, it's not hard to just add the intent.
    var i = index;
    if ("AMAZON.StartOverIntent" === intentName) {
        i = 0;
    } else if ("AMAZON.NextIntent" === intentName) {
        i = index + 1;
    } else if ("AMAZON.PreviousIntent" === intentName) {
        i = Math.max(0, index - 1);
    } else if ("LastItemIntent" === intentName) {
        i = maxLength - 1;
    }
    return i
}
