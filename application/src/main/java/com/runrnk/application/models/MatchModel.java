package com.runrnk.application.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.runrnk.application.enums.MatchStatus;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MatchModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private UserModel player1;

    @ManyToOne
    private UserModel player2; // null if solo

    private boolean isSolo = false;

    @Enumerated(EnumType.STRING)
    private MatchStatus status;

    @ManyToOne
    private RouteModel route;

    private String player1PhotoUrl; // live camera photo
    private String player2PhotoUrl;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private Long player1CompletionMs; // time to finish in milliseconds
    private Long player2CompletionMs;

    @ManyToOne
    private UserModel winner;

    // For solo mode
    private Long yesterdayBestMs;
}