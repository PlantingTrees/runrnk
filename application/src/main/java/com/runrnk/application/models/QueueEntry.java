package com.runrnk.application.models;


import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Point;
import java.time.LocalDateTime;
import com.runrnk.application.enums.QueueStatus;

@Entity
@Table(name = "queue_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private UserModel user;

    @Column(columnDefinition = "geography(Point,4326)")
    private Point location;

    private LocalDateTime joinedAt;

    @Enumerated(EnumType.STRING)
    private QueueStatus status;
}
