package com.example.evie.music_assistant;

/**
 * Created by Harry on 4/24/2017.
 */

public enum Beats {
    one("1"),
    two("2"),
    three("3"),
    four("4"),
    five("5"),
    six("6"),
    seven("7"),
    eight("8");

    private String beat;

    Beats(String beat) {
        this.beat = beat;
    }

    @Override public String toString() {
        return beat;
    }

    public short getNum() {
        return Short.parseShort(beat);
    }

}
