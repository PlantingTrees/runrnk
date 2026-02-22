package com.runrnk.application.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MatchFoundMessage {
    private Long matchId;
    private String opponentUsername;
    private String message;
}
