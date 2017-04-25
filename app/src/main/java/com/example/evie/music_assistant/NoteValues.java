package com.example.evie.music_assistant;

/**
 * Created by Harry on 4/24/2017.
 */

public enum NoteValues {
    four("4");

    private String noteValue;

    NoteValues(String noteValue) {
        this.noteValue = noteValue;
    }

    @Override public String toString() {
        return noteValue;
    }
}
