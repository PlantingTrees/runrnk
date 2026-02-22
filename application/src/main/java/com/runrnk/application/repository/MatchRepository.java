package com.runrnk.application.repository;


import com.runrnk.application.enums.MatchStatus;
import com.runrnk.application.models.MatchModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface MatchRepository extends JpaRepository<MatchModel, Long> {
    @Query("""
        SELECT m FROM MatchModel m
        WHERE m.status = :status
          AND (m.player1.id = :userId OR m.player2.id = :userId)
        ORDER BY m.id DESC
    """)
    List<MatchModel> findByUserIdAndStatusOrderByNewest(
        @Param("userId") Long userId,
        @Param("status") MatchStatus status
    );
}
