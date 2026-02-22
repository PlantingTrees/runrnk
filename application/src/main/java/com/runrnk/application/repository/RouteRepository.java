package com.runrnk.application.repository;

import com.runrnk.application.models.RouteModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteRepository extends JpaRepository<RouteModel, Long> {
}