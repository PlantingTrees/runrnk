package com.runrnk.application.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // e.g. "The Dog"

    @Column(columnDefinition = "text")
    @JdbcTypeCode(SqlTypes.JSON)
    private String geoJson; // GeoJSON LineString of coordinates

    private double centerLat;
    private double centerLng;
    private double radiusMeters;
}