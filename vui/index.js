'use strict';

console.log("Loading");

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

var recordings = {};

// Tokens for later
var metronome_token = "pizza";
var metronome_high = "high_note";
var metronome_low = "low_note";

// Way to make it dry: get the base url and append the string associated + .mp3
var tuner_url_dict = {
    "a flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Gsharp4.mp3",
    "a": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/A4.mp3",
    "a sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Asharp4.mp3",
    "b flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Asharp4.mp3",
    "b": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/B4.mp3",
    "c": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/C4.mp3",
    "c sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/C4.mp3",
    "d flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Csharp4.mp3",
    "d": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/D4.mp3",
    "d sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Dsharp4.mp3",
    "e flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Dsharp4.mp3",
    "e": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/E4.mp3",
    "f": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/F4.mp3",
    "f sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Fsharp4.mp3",
    "g flat": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Fsharp4.mp3",
    "g": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/G4.mp3",
    "g sharp": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/short/Gsharp4.mp3",
};

// hard coding the beats for now, not worrying about "up"
var metronome_url_dict = {
    "default": "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/notes/metronome/100bpm4-4-hold.mp3",
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
		if (event.session.application.applicationId !== "amzn1.ask.skill.84e7e330-f816-4192-a826-6bf4c87279a0") {
            context.fail("Invalid Application ID");
        }
		
        var params = {
            TableName: "Recordings"
		};


        // adapted code from piazza post
        // This is where we would populate the dict with the file names and urls
        /*dynamo.scan(params, function(err, data) {
            if (err) {
                console.log("Failed to get data", err);
            }
            for (var item in data.Items) {
                item = data.Items[item];
                const name = item['RecordingName'].toLowerCase();
                recordings_dict[name] = item;
            }
        });*/
        // strip extensions, title is marked as if it had no extension
        recordings["piano"] =  "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/recordings/piano.mp3";
        recordings["sax"] =  "https://s3-us-west-1.amazonaws.com/cs160.music.tuning.notes/recordings/sax.mp3";

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        // re add  && sessionAttributes.isMetronome && event.session.attributes.metronomeUrl ?
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
    } else if ("SelectTaskIntent" === intentName) {
        handleMainMenuRequest(intent, session, callback)
    } else if (session.attributes && session.attributes.isTuning) {
        handleTuningDialogRequest(intent, session, callback);
	} else if (session.attributes && session.attributes.isRecordingList) {
        handleRecordingListRequest(intent, session, callback);
	} else if (session.attributes && session.attributes.isMetronome) {
        handleMetronomeRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) { // quit if at main menu (implied from not being in any current dialog)
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.PauseIntent" === intentName) {
        handlePauseRequest(intent, session, callback);
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

var CARD_TITLE = "Dyno Muse";

function getWelcomeResponse(callback) {
    var sessionAttributes = {},
        speechOutput = "Welcome to Dyno Muse, what would you like to do?",
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

function handlePauseRequest(intent, session, callback) {
    var speechOutput = "Stopping all currently playing audio or metronome. What else do you want to do?";
    callback(session.attributes,
        buildSpeechletWithDirectives(CARD_TITLE, speechOutput, speechOutput, false, "stop", null, null, null, null, null));
}

function handleMainMenuRequest(intent, session, callback) {
    // Parses initial task request to go into metronome, tuner, or recording task
	/* Should we have separate intents for the three tasks? Make it analagous here with 3 cases //make Matthew explain
    */

	var speechOutput = "";

    if (session.attributes.speed == null) {
        session.attributes.speed = "100";
        session.attributes.note = "a";
        session.attributes.sig = "four four";
    }

	if ("SelectTaskIntent" === intent.name) {
		//3 tasks possible
		var task = intent.slots.utteredTask.value;
		if (task === "tuner") {
			session.attributes.isTuning = true;
			session.attributes.isRecordingList = false;
			session.attributes.isMetronome = false;
			handleTuningDialogRequest(intent, session, callback);
		} else if (task === "metronome") {
			session.attributes.isTuning = false;
			session.attributes.isRecordingList = false;
			session.attributes.isMetronome = true;
			handleMetronomeRequest(intent, session, callback);
		} else if (task === "record" || task === "recording") {
			session.attributes.isTuning = false;
			session.attributes.isRecordingList = true;
			session.attributes.isMetronome = false;
			handleRecordingListRequest(intent, session, callback);
		} else {
		    var reprompt = session.attributes.repromptText,
            speechOutput = "I'm sorry, I couldn't understand you. You can start the metronome, tuner, or look at your recordings. " + reprompt;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
		}
	}
	else {
		var reprompt = session.attributes.repromptText,
            speechOutput = "Oops I don't think you're supposed to be here, what task would you like help with?" + reprompt;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
	}
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

        getWelcomeResponse(callback);
    } else if ("SelectNoteIntent" === intent.name) {
        // Jump right into that particular note
		var note = intent.slots.utteredNote.value;
        var url = "'" + tuner_url_dict[note.toLowerCase()] + "'"; // quotes for later
        var str = "<speak> Okay, here's  " + note + ". You will hear it twice. <break time='1s'/>"
                + "<audio src=" + url + " /> <break time='1s'/> <audio src=" + url + " /> </speak>";
        var out = "Here is " + note + " key!";

        callback(session.attributes,
            buildSSMLResponse(CARD_TITLE, str, out, false));
    } else if ("SelectTaskIntent" === intent.name) {
        speechOutput += "Welcome to the tuner! What note would you like to hear?"
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if ("GetNoteIntent" === intent.name) {
        var note = sessionAttributes.note;
        speechOutput += "The current note is " + note + ". Let me know what note you would like to play."
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else { //might not necessarily have to be reprompt
        var reprompt = session.attributes.repromptText,
            speechOutput = "Sorry, what note would you like to tune to?" + reprompt;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
	}
}

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

        getWelcomeResponse(callback)
	} else {
        if ("SelectTaskIntent" === intent.name) {
            speechOutput += "I can tell you what recordings I have found or you can ask for a particular recording right now.";
            callback(session.attributes,
                buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
        } else {
            if ("GetRecordingListIntent" === intent.name) { // say the recordings that are stored.
                var numRec = 0;
                var listOfRecordings = "";
                    for (var key in recordings) {
                        numRec += 1;
                        listOfRecordings += key;
                        listOfRecordings += ", ";
                    }
                if (numRec == 0) {
                    speechOutput = "I did not find any recordings. Have you recorded some recently?";
                }
                else {
                    var plural = "s"
                    if (numRec == 1) {
                        plural = "";
                    }
                    // Hacky way of parsing through recordings and feeding into a string
                    listOfRecordings = listOfRecordings.substring(0, listOfRecordings.length - 2);
                    speechOutput = "I found " + numRec + " recording" + plural + ". They are: " + listOfRecordings + ".";
                }
                callback(session.attributes,
                    buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
            } else if ("SelectRecIntent" === intent.name) {
                var rec = intent.slots.utteredRec.value;
                var recording = recordings[rec.toLowerCase()];
				if (recording) {
					//play the recording they said to
                    recording = "'" + recording + "'";
                    speechOutput = "<speak><audio src=" + recording + "/></speak>";
                    callback(session.attributes,
                        buildSSMLResponse(CARD_TITLE, speechOutput, "Here is the recording!", false));
				} else {
                    speechOutput = "I could not find the recording titled " + rec.toLowerCase() + ".";

                    callback(session.attributes,
                        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
                }
			} else {
                speechOutput = "I did not understand what you wanted to do.";

                callback(session.attributes,
                    buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
            }
        }
    }
}

function handleMetronomeRequest(intent, session, callback) {
    /* Handles Metronome Task
     * User can:
     * - start metronome
     * - stop metronome
     * - change the tempo
     * - change the time signature
    */
   var speechOutput = "";

   if ("AMAZON.StopIntent" === intent.name) {
        // Back out into the main menu
        speechOutput += session.attributes.speechOutput;
        delete session.attributes.isMetronome;
        delete session.attributes.isTuning;
        delete session.attributes.isRecording;
        delete session.attributes.metronomeUrl;

        getWelcomeResponse(callback)
    } else if ("SelectTaskIntent" === intent.name) {
        speechOutput += "Welcome to the metronome! The current speed is " + session.attributes.speed + " with a " + session.attributes.sig
                        + " time signature. To begin, say 'play'.";
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if ("SelectSpeedIntent" === intent.name) {
        var speed = intent.slots.utteredSpeed.value;
        // for now the speed doesn't matter
        if (parseInt(speed) > 200) {
            speechOutput = "The tempo cannot be greater than 200 BPM.";
        } else if (parseInt(speed) < 50) {
            speechOutput = "The tempo cannot be less than 50 BPM.";
        } else {
            speechOutput = "Tempo is set to " + speed + "BPM.";
            session.attributes.speed = speed
        }
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if ("SelectSigIntent" === intent.name) {
        var sig = intent.slots.utteredSig.value;
        // for now time signature does not matter
        session.attributes.sig = sig;
        speechOutput = "Time signature is now " + sig + ".";
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if ("GetSpeedIntent" === intent.name) {
        var speed = sessionAttributes.speed;
        speechOutput += "The current speed is " + speed + "beats per minute. You can change the speed, or resume the metronome."
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if ("GetSigIntent" === intent.name) {
        var sig = sessionAttributes.sig;
        speechOutput += "The current time signature is " + sig + ". You may change the time signature, or resume the metronome."
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if ("AMAZON.PauseIntent" === intent.name) {
        speechOutput = "Stopping the metronome. What else do you want to do?";
        callback(session.attributes,
            buildSpeechletWithDirectives(CARD_TITLE, speechOutput, speechOutput, false, "stop", null, null, null, null, null));
    } else if ("AMAZON.ResumeIntent" === intent.name) {
        // also do something
        speechOutput = "Starting the metronome.";
        session.attributes.metronomeUrl = metronome_url_dict["default"];
        callback(session.attributes,        
            buildSpeechletWithDirectives(CARD_TITLE, speechOutput, speechOutput, true, "play", "REPLACE_ALL", session.attributes.metronomeUrl, metronome_token, null, 0));
        callback(session.attributes, test);
    } else {
        speechOutput = "I do not support that action.";
    }
}

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining possible responses.
    // Output varies on session.attributes
    var speechOutput = "",
        repromptText = "",
        shouldEndSession = false;
    if (session.attributes.isTuning) {
        speechOutput = "When tuning, you can have me play any note so you can hear it and adjust your instrument as needed. "
            + "To do this, you can say 'Tune to the key of G,' for example. "
			+ "I will play the note for you twice, and you can either listen to the same note, choose a new one, or quit tuning."
           // + "You can say next or previous to have me read off the next or previous note in standard tuning. "
            // + "I can also start over from the stop if needed when you say 'start again'. "
    } else if (session.attributes.isMetronome) {
        speechOutput = "With the metronome, I can keep time in any tempo from 50 to 200 beats per minute. "
            + "You can say 'play at 100 bpm', for example, to change the speed. "
            + "100bpm is the default setting. "
            + "You may also choose the time signature by saying 'play in 4 4 time' which is the default time signature. "
            + "You may also choose to have no time signature so all notes sound the same. "
			+ "You may stop the metronome with 'stop' and resume or change your settings at any time.";
    } else if (session.attributes.isRecordingList) {
        speechOutput = "Here, we can listen to your previous recordings. "
            + "You can say 'Find Blue Song' to find your recording titled 'Blue Song'. "
            + "If I have your recording, I will play it for you. "
            + "If your unsure of the recording title, I will ask you if you want to go through the list of your recordings. "
			+ "For each recording in your saved recordings, I will tell you the name and you will have the option to 'listen' to it or go to the 'next' or 'previous' recording. "
			+ "You may 'pause', 'play', 'restart', or 'stop' your recording at any time.";
    }else {
        speechOutput = "You can tune your instrument, use a metronome to practice, or listen to your recordings. " //If user just says help in the main menu?
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

// ------- Helper functions to build responses and directives -------

function buildAudioPlayerDirective(directiveType, behavior, url, token, expectedPreviousToken, offsetInMilliseconds) {
    var audioPlayerDirective;
    if (directiveType === 'play') {
        audioPlayerDirective = {
            "type": "AudioPlayer.Play",
            "playBehavior": behavior,
            "audioItem": {
                "stream": {
                    "url": url,
                    "token": token,
                    "expectedPreviousToken": expectedPreviousToken,
                    "offsetInMilliseconds": offsetInMilliseconds
                }
            }
        };
    } else if (directiveType === 'stop') {
        audioPlayerDirective = {
            "type": "AudioPlayer.Stop"
        };
    } else {
        audioPlayerDirective = {
            "type": "AudioPlayer.Stop",
            "clearBehavior": behavior
        };
    }

    //responseObject.response.directives = [audioPlayerDirective];
    return audioPlayerDirective;
}

// "Loop" by repeating what is in the current queue. To be called when the stream is almost done.
function repeatMetronomeDirective(url, token) {
    return {
        directives: [buildAudioPlayerDirective("play", "ENQUEUE", url, token, token, 0)],
    };
}

function buildSpeechletWithDirectives(title, output, repromptText, shouldEndSession, directiveType, behavior, url, token, previousToken, offsetInMilliseconds) {
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
        directives: [buildAudioPlayerDirective(directiveType, behavior, url, token, previousToken, offsetInMilliseconds)],
        shouldEndSession: shouldEndSession
    };
}

function buildSSMLResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: output
        },
        card: {
            type: "Simple",
            title: title,
            content: repromptText
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