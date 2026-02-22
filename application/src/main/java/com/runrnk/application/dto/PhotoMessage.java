package com.runrnk.application.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PhotoMessage {
    private Long matchId;
    private String fromUsername;
    private String photoBase64; // live camera photo
}