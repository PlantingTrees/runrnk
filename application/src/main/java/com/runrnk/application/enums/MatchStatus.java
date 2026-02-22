package com.runrnk.application.enums;

public enum MatchStatus {
    PENDING,        // match found, waiting for both to accept
    PHOTO_EXCHANGE, // both accepted, exchanging verification photos
    ACTIVE,         // race in progress
    COMPLETED,      // race finished
    CANCELLED       // someone dropped out
}