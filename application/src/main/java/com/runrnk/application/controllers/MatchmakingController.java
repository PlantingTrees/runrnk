package com.runrnk.application.controllers;

import com.runrnk.application.enums.MatchStatus;
import com.runrnk.application.enums.QueueStatus;
import com.runrnk.application.models.MatchModel;
import com.runrnk.application.models.*;
import com.runrnk.application.repository.MatchRepository;
import com.runrnk.application.repository.QueueEntryRepository;
import com.runrnk.application.repository.UserRepository;
import com.runrnk.application.services.MatchmakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;
    private final UserRepository userRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final MatchRepository matchRepository;

   @PostMapping("/join")
public ResponseEntity<?> joinQueue(
    @RequestParam Long userId,
    @RequestParam double lat,
    @RequestParam double lng
) {
    UserModel user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    if (user.getTokens() < 100) {
        return ResponseEntity.badRequest()
            .body("Not enough tokens to play. Come back tomorrow.");
    }

    // Check if already in queue
    boolean alreadyWaiting = queueEntryRepository.findAll()
        .stream()
        .anyMatch(e -> e.getUser().getId().equals(userId)
            && e.getStatus() == QueueStatus.WAITING);

    if (alreadyWaiting) {
        return ResponseEntity.ok("Already in queue");
    }

    matchmakingService.joinQueue(user, lat, lng);
    return ResponseEntity.ok("Joined queue");
}

    @GetMapping("/status")
    public ResponseEntity<?> queueStatus(@RequestParam Long userId) {
        UserModel user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        MatchModel match = matchRepository.findByUserIdAndStatusOrderByNewest(userId, MatchStatus.PENDING)
            .stream()
            .findFirst()
            .orElse(null);

        if (match == null) {
            return ResponseEntity.ok(new MatchmakingStatusResponse(false, null, null));
        }

        UserModel opponent = match.getPlayer1().getId().equals(user.getId())
            ? match.getPlayer2()
            : match.getPlayer1();

        return ResponseEntity.ok(new MatchmakingStatusResponse(
            true,
            match.getId(),
            opponent != null ? opponent.getUsername() : null
        ));
    }

    public record MatchmakingStatusResponse(boolean matched, Long matchId, String opponentUsername) {}
} 
