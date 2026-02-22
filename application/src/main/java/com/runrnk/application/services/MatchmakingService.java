package com.runrnk.application.services;

import com.runrnk.application.dto.MatchFoundMessage;
import com.runrnk.application.dto.QueueExpiredMessage;
import com.runrnk.application.enums.*;
import com.runrnk.application.models.*;
import com.runrnk.application.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    private final QueueEntryRepository queueEntryRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final GeometryFactory geometryFactory = new GeometryFactory();

    private static final double MATCH_RADIUS_METERS = 2000;
    private static final int QUEUE_TIMEOUT_SECONDS = 30;

    public QueueEntry joinQueue(UserModel user, double lat, double lng) {
        log.info("joinQueue user={} userId={} lat={} lng={}", user.getUsername(), user.getId(), lat, lng);
        Point location = geometryFactory.createPoint(new Coordinate(lng, lat));
        location.setSRID(4326);
        user.setLocation(location);
        userRepository.save(user);

        QueueEntry entry = new QueueEntry();
        entry.setUser(user);
        entry.setLocation(location);
        entry.setJoinedAt(LocalDateTime.now());
        entry.setStatus(QueueStatus.WAITING);

        return queueEntryRepository.save(entry);
    }

    // Runs every 2 seconds — tries to pair all waiting users
    @Scheduled(fixedRate = 2000)
    public void processQueue() {
        List<QueueEntry> waiting = queueEntryRepository.findAllByStatus(QueueStatus.WAITING)
            .stream()
            .filter(e -> e.getStatus() == QueueStatus.WAITING)
            .toList();

        for (QueueEntry entry : waiting) {
            // Skip if already matched by a previous iteration in this cycle
            if (entry.getStatus() != QueueStatus.WAITING) continue;

            // Re-fetch to get latest status from DB
            QueueEntry fresh = queueEntryRepository.findById(entry.getId()).orElse(null);
            if (fresh == null || fresh.getStatus() != QueueStatus.WAITING) continue;

            double lat = fresh.getLocation().getY();
            double lng = fresh.getLocation().getX();

            QueueEntry opponent = queueEntryRepository.findNearbyWaitingUser(
                fresh.getUser().getId(), lat, lng, MATCH_RADIUS_METERS
            );

            if (opponent != null) {
                log.info("matchFound user1={} user2={}", fresh.getUser().getUsername(), opponent.getUser().getUsername());
                fresh.setStatus(QueueStatus.MATCHED);
                opponent.setStatus(QueueStatus.MATCHED);
                queueEntryRepository.save(fresh);
                queueEntryRepository.save(opponent);

                MatchModel match = new MatchModel();
                match.setPlayer1(fresh.getUser());
                match.setPlayer2(opponent.getUser());
                match.setSolo(false);
                match.setStatus(MatchStatus.PENDING);
                matchRepository.save(match);

                notificationService.notifyMatchFound(
                    fresh.getUser().getUsername(),
                    new MatchFoundMessage(match.getId(),
                        opponent.getUser().getUsername(),
                        "Match found! Get ready.")
                );
                notificationService.notifyMatchFound(
                    opponent.getUser().getUsername(),
                    new MatchFoundMessage(match.getId(),
                        fresh.getUser().getUsername(),
                        "Match found! Get ready.")
                );
            }
        }
    }

    // Runs every second — expires users who waited too long
    @Scheduled(fixedRate = 1000)
    public void expireQueueEntries() {
        List<QueueEntry> waiting = queueEntryRepository.findAllByStatus(QueueStatus.WAITING)
            .stream()
            .filter(e -> e.getStatus() == QueueStatus.WAITING)
            .filter(e -> e.getJoinedAt()
                .isBefore(LocalDateTime.now().minusSeconds(QUEUE_TIMEOUT_SECONDS)))
            .toList();

        for (QueueEntry entry : waiting) {
            entry.setStatus(QueueStatus.EXPIRED);
            queueEntryRepository.save(entry);
            log.info("queueExpired user={} entryId={}", entry.getUser().getUsername(), entry.getId());

            notificationService.notifyQueueExpired(
                entry.getUser().getUsername(),
                new QueueExpiredMessage("No runners nearby. Run solo?",
                    entry.getId())
            );
        }
    }

    public record MatchResult(boolean matched, MatchModel match, QueueEntry queueEntry) {}
}
