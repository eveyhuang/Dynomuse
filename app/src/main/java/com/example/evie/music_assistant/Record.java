package com.example.evie.music_assistant;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Environment;
import android.os.Handler;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.*;
import android.content.*;
import android.widget.*;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

public class Record extends AppCompatActivity {
    private static final int RECORDER_SAMPLERATE = 8000;
    private static final int RECORDER_CHANNELS = AudioFormat.CHANNEL_IN_MONO;
    private static final int RECORDER_AUDIO_ENCODING = AudioFormat.ENCODING_PCM_16BIT;
    private AudioRecord recorder = null;
    private Thread recordingThread = null;
    private boolean isRecording = false;
    private int bufferSizeInBytes;
    private int bufferSize;
    private ImageButton startButton,stopButton;

    TextView timerTextView;
    long startTime = 0;

    //runs without a timer by reposting this handler at the end of the runnable
    Handler timerHandler = new Handler();
    Runnable timerRunnable = new Runnable() {

        @Override
        public void run() {
            long millis = System.currentTimeMillis() - startTime;
            int seconds = (int) (millis / 1000);
            int minutes = seconds / 60;
            seconds = seconds % 60;

            timerTextView.setText(String.format("%d:%02d", minutes, seconds));

            timerHandler.postDelayed(this, 500);
        }
    };


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle("Record");
        setContentView(R.layout.recordscreen);
        startButton = (ImageButton) findViewById (R.id.imageButton2);
        stopButton = (ImageButton)  findViewById (R.id.imageButton5);

        //startButton.setOnClickListener (startListener);
        stopButton.setOnClickListener (stopListener);

        bufferSize = AudioRecord.getMinBufferSize(44100,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT);

        recorder = new AudioRecord(MediaRecorder.AudioSource.DEFAULT,
                44100,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize);

        timerTextView = (TextView) findViewById(R.id.timerTextView);
    }

    private void goToRecordList(View view) {

    }



    int BufferElements2Rec = 1024; // want to play 2048 (2K) since 2 bytes we use only 1024
    int BytesPerElement = 2; // 2 bytes in 16bit format


    public void startRecording(View view){

       // AudioRecord recorder = findAudioRecord();
        if (recorder==null & isRecording == false){
            recorder = new AudioRecord(MediaRecorder.AudioSource.DEFAULT,
                    44100,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize);
        }

        recorder.startRecording();
        isRecording = true;
        startTime = System.currentTimeMillis();
        timerHandler.postDelayed(timerRunnable, 0);

        recordingThread = new Thread(new Runnable() {
            public void run() {
                String filePath = Environment.getExternalStorageDirectory().getPath();
                short sData[] = new short[BufferElements2Rec];

                FileOutputStream os = null;
                try {
                    os = new FileOutputStream(filePath+"/record.pcm");
                } catch (FileNotFoundException e) {
                    e.printStackTrace();
                }

                while (isRecording) {
                    // gets the voice output from microphone to byte format

                    recorder.read(sData, 0, BufferElements2Rec);
                    System.out.println("Short wirting to file" + sData.toString() + " at " + filePath);
                    try {
                        // // writes the data to file from buffer
                        // // stores the voice buffer
                        byte bData[] = short2byte(sData);
                        os.write(bData, 0, BufferElements2Rec * BytesPerElement);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
                try {
                    os.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }

            }
        }, "AudioRecorder Thread");
        recordingThread.start();

    }


    //convert short to byte
    public byte[] short2byte(short[] sData) {
        int shortArrsize = sData.length;
        byte[] bytes = new byte[shortArrsize * 2];
        for (int i = 0; i < shortArrsize; i++) {
            bytes[i * 2] = (byte) (sData[i] & 0x00FF);
            bytes[(i * 2) + 1] = (byte) (sData[i] >> 8);
            sData[i] = 0;
        }
        return bytes;
    }

    private final View.OnClickListener stopListener = new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            if (null != recorder) {
                isRecording = false;
                recorder.stop();
                recorder.release();
                recorder = null;
                recordingThread = null;
                timerHandler.removeCallbacks(timerRunnable);
                System.out.println("Recorder released");
                EditText et=(EditText)findViewById(R.id.editText2);
                et.setVisibility(View.VISIBLE);
            }

        }

    };


}