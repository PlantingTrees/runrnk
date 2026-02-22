package com.runrnk.application.controllers;

import com.runrnk.application.dto.PhotoMessage;
import com.runrnk.application.models.MatchModel;
import com.runrnk.application.models.UserModel;
import com.runrnk.application.repository.MatchRepository;
import com.runrnk.application.repository.UserRepository;
import com.runrnk.application.services.MatchService;
import com.runrnk.application.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/match")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // Both players hit this when they accept the match
    @PostMapping("/{matchId}/start")
    public ResponseEntity<?> startMatch(@PathVariable Long matchId) {
        try {
            MatchModel match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));
            matchService.startMatch(match);
            return ResponseEntity.ok("Match started");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "message", e.getMessage()
            ));
        }
    }

    // Player sends their live camera photo to opponent
    @PostMapping("/{matchId}/photo")
    public ResponseEntity<?> sendPhoto(
        @PathVariable Long matchId,
        @RequestBody SendPhotoRequest request
    ) {
        if (request == null || request.fromUserId() == null || request.photoBase64() == null || request.photoBase64().isBlank()) {
            return ResponseEntity.badRequest().body("Missing fromUserId or photoBase64");
        }

        Long fromUserId = request.fromUserId();
        String photoBase64 = request.photoBase64();

        MatchModel match = matchRepository.findById(matchId)
            .orElseThrow(() -> new RuntimeException("Match not found"));

        UserModel fromUser = userRepository.findById(fromUserId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Figure out who to send to
        boolean isPlayer1 = match.getPlayer1().getId().equals(fromUserId);
        UserModel toUser = isPlayer1 ? match.getPlayer2() : match.getPlayer1();
        if (toUser == null) {
            return ResponseEntity.badRequest().body("No opponent in this match");
        }

        // Push to opponent via WebSocket
        notificationService.sendPhoto(
            toUser.getUsername(),
            new PhotoMessage(matchId, fromUser.getUsername(), photoBase64)
        );

        return ResponseEntity.ok("Photo sent");
    }

    // Player finishes the route
    @PostMapping("/{matchId}/complete")
    public ResponseEntity<?> completeRace(
        @PathVariable Long matchId,
        @RequestParam Long userId,
        @RequestParam Long completionMs
    ) {
        matchService.playerCompleted(matchId, userId, completionMs);
        return ResponseEntity.ok("Completion recorded");
    }

    public record SendPhotoRequest(Long fromUserId, String photoBase64) {}
}
