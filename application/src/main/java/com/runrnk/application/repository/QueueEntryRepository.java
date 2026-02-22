package com.runrnk.application.repository;

import com.runrnk.application.models.QueueEntry;
import com.runrnk.application.enums.QueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QueueEntryRepository extends JpaRepository<QueueEntry, Long> {

    @Query(value = """
        SELECT q.* FROM queue_entries q
        WHERE q.status = 'WAITING'
        AND q.user_id != :userId
        AND ST_DWithin(
            q.location::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radiusMeters
        )
        ORDER BY q.joined_at ASC
        LIMIT 1
    """, nativeQuery = true)
    QueueEntry findNearbyWaitingUser(
        @Param("userId") Long userId,
        @Param("lat") double lat,
        @Param("lng") double lng,
        @Param("radiusMeters") double radiusMeters
    );

    @Query("SELECT q FROM QueueEntry q WHERE q.user.id = :userId AND q.status = :status")
    Optional<QueueEntry> findByUserIdAndStatus(
        @Param("userId") Long userId,
        @Param("status") QueueStatus status
    );

    @Query("SELECT q FROM QueueEntry q WHERE q.status = :status")
    List<QueueEntry> findAllByStatus(@Param("status") QueueStatus status);
}
