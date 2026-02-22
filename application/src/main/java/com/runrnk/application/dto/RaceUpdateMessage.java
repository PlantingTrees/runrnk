package com.runrnk.application.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RaceUpdateMessage {
    private Long matchId;
    private String username;
    private double lat;
    private double lng;
    private boolean completed;
    private Long completionMs;
}