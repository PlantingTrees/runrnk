package com.runrnk.application.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QueueExpiredMessage {
    private String message;
    private Long queueEntryId;
}