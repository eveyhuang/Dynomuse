package com.example.evie.music_assistant;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.*;
import android.content.*;
import android.widget.*;
import android.widget.AdapterView.OnItemSelectedListener;
import android.app.*;
import android.media.*;
import android.os.*;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;

public class Tuner extends AppCompatActivity {

    private final int duration = 3; // seconds
    private final int sampleRate = 8000;
    private final int numSamples = duration * sampleRate;
    private final double sample[] = new double[numSamples];
    private double freqOfTone = 261.63; // hz

    private final byte generatedSnd[] = new byte[2 * numSamples];

    Handler handler = new Handler();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.tunerscreen);
        Spinner spinner = (Spinner) findViewById(R.id.notes_spinner);
        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(this,
                R.array.notes_array, R.layout.spinner_layout);
        adapter.setDropDownViewResource(R.layout.spinner_dropdown);
        spinner.setAdapter(adapter);
        spinner.setOnItemSelectedListener(SpinnerListener);
    }

    private OnItemSelectedListener SpinnerListener = new OnItemSelectedListener() {

        @Override
        public void onItemSelected(AdapterView<?> arg0, View arg1, int arg2,
                                   long arg3) {
            // TODO Auto-generated method stub
            String note = (String) arg0.getItemAtPosition(arg2);
            switch (note) {
                case "C":
                    freqOfTone = 261.63;
                    break;
                case "C#/Db":
                    freqOfTone = 277.18;
                    break;
                case "D":
                    freqOfTone = 293.66;
                    break;
                case "D#/Eb":
                    freqOfTone = 311.13;
                    break;
                case "E":
                    freqOfTone = 329.63;
                    break;
                case "F":
                    freqOfTone = 349.23;
                    break;
                case "F#/Gb":
                    freqOfTone = 369.99;
                    break;
                case "G":
                    freqOfTone = 392;
                    break;
                case "G#/Ab":
                    freqOfTone = 415.3;
                    break;
                case "A":
                    freqOfTone = 440;
                    break;
                case "A#/Bb":
                    freqOfTone = 466.16;
                    break;
                case "B":
                    freqOfTone = 493.88;
                    break;
            }
        }

        @Override
        public void onNothingSelected(AdapterView<?> arg0) {
            // TODO Auto-generated method stub

        }

    };

    @Override
    protected void onResume() {
        super.onResume();

        // Use a new tread as this can take a while
        final Thread thread = new Thread(new Runnable() {
            public void run() {
                genTone();
                handler.post(new Runnable() {

                    public void run() {
                        playSound();
                    }
                });
            }
        });
        thread.start();
    }

    void genTone(){
        // fill out the array
        for (int i = 0; i < numSamples; ++i) {
            sample[i] = Math.sin(2 * Math.PI * i / (sampleRate/freqOfTone));
        }

        // convert to 16 bit pcm sound array
        // assumes the sample buffer is normalised.
        int idx = 0;
        for (final double dVal : sample) {
            // scale to maximum amplitude
            final short val = (short) ((dVal * 32767));
            // in 16 bit wav PCM, first byte is the low order byte
            generatedSnd[idx++] = (byte) (val & 0x00ff);
            generatedSnd[idx++] = (byte) ((val & 0xff00) >>> 8);

        }
    }

    void playSound(){
        final AudioTrack audioTrack = new AudioTrack(AudioManager.STREAM_MUSIC,
                sampleRate, AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT, generatedSnd.length,
                AudioTrack.MODE_STATIC);
        audioTrack.write(generatedSnd, 0, generatedSnd.length);
        audioTrack.play();
    }


    public void playNote(View view) {
        onResume();
    }
}
