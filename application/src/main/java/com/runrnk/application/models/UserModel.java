package com.runrnk.application.models;

import lombok.*;
import org.locationtech.jts.geom.Point;

import com.runrnk.application.enums.Rank;

import jakarta.persistence.*;
import java.time.LocalDateTime;


@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @Column(columnDefinition = "geography(Point,4326)")
    private Point location;

    @Enumerated(EnumType.STRING)
    private Rank rank;

    private int tokens = 100;

    private boolean hasEverLost = false;

    private String timezone; // e.g. "America/New_York"

    private LocalDateTime tokenResetTime; // next midnight reset

    private LocalDateTime timestamp;
}