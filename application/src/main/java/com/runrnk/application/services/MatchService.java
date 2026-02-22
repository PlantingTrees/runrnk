package com.runrnk.application.services;

import com.runrnk.application.dto.RaceUpdateMessage;
import com.runrnk.application.enums.MatchStatus;
import com.runrnk.application.models.*;
import com.runrnk.application.repository.MatchRepository;
import com.runrnk.application.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final RankService rankService;
    private final NotificationService notificationService;

    
    private final RouteGenerationService routeGenerationService;
    
    // Called when a match is accepted by both players — deduct tokens
    public void startMatch(MatchModel match) {
        synchronized (("match-start-" + match.getId()).intern()) {
            MatchModel current = matchRepository.findById(match.getId())
                .orElseThrow(() -> new RuntimeException("Match not found"));

            if (current.getRoute() != null && current.getStatus() == MatchStatus.ACTIVE) {
                return;
            }

            tokenService.deductTokens(current.getPlayer1());
            if (!current.isSolo()) {
                tokenService.deductTokens(current.getPlayer2());
            }

            // Generate route centered on whichever player's location is available.
            Point routeCenter = current.getPlayer1() != null ? current.getPlayer1().getLocation() : null;
            if (routeCenter == null && current.getPlayer2() != null) {
                routeCenter = current.getPlayer2().getLocation();
            }
            if (routeCenter == null) {
                throw new RuntimeException("No player location available for route generation. Rejoin queue and allow location.");
            }

            double lat = routeCenter.getY();
            double lng = routeCenter.getX();

            RouteModel route = routeGenerationService.generateRoute(lat, lng, "dog");
            current.setRoute(route);
            current.setStatus(MatchStatus.ACTIVE);
            current.setStartTime(LocalDateTime.now());
            matchRepository.save(current);

            // Notify both players that race has started
            notificationService.sendRaceUpdate(
                current.getPlayer1().getUsername(),
                new RaceUpdateMessage(current.getId(),
                    current.getPlayer1().getUsername(), lat, lng, false, null)
            );
            if (!current.isSolo()) {
                notificationService.sendRaceUpdate(
                    current.getPlayer2().getUsername(),
                    new RaceUpdateMessage(current.getId(),
                        current.getPlayer2().getUsername(), lat, lng, false, null)
                );
            }
        }
    }

    // Called when a player finishes the route
    public void playerCompleted(Long matchId, Long userId, Long completionMs) {
        MatchModel match = matchRepository.findById(matchId)
            .orElseThrow(() -> new RuntimeException("Match not found"));

        UserModel user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (match.isSolo()) {
            handleSoloCompletion(match, user, completionMs);
        } else {
            handleMultiCompletion(match, user, completionMs);
        }
    }

    private void handleSoloCompletion(MatchModel match, UserModel user, Long completionMs) {
        match.setPlayer1CompletionMs(completionMs);
        match.setStatus(MatchStatus.COMPLETED);
        match.setEndTime(LocalDateTime.now());

        boolean beatYesterday = match.getYesterdayBestMs() == null
            || completionMs < match.getYesterdayBestMs();

        if (beatYesterday) {
            tokenService.soloWin(user);
        } else {
            tokenService.soloLoss(user);
            tokenService.scheduleTokenReset(user);
        }

        matchRepository.save(match);

        notificationService.sendRaceUpdate(
            user.getUsername(),
            new RaceUpdateMessage(match.getId(), user.getUsername(),
                0, 0, true, completionMs)
        );
    }

    private void handleMultiCompletion(MatchModel match, UserModel user, Long completionMs) {
        boolean isPlayer1 = match.getPlayer1().getId().equals(user.getId());

        if (isPlayer1) {
            match.setPlayer1CompletionMs(completionMs);
        } else {
            match.setPlayer2CompletionMs(completionMs);
        }

        // Check if both players have finished
        if (match.getPlayer1CompletionMs() != null
                && match.getPlayer2CompletionMs() != null) {

            UserModel player1 = match.getPlayer1();
            UserModel player2 = match.getPlayer2();

            UserModel winner = match.getPlayer1CompletionMs()
                <= match.getPlayer2CompletionMs() ? player1 : player2;
            UserModel loser = winner.getId().equals(player1.getId())
                ? player2 : player1;

            match.setWinner(winner);
            match.setStatus(MatchStatus.COMPLETED);
            match.setEndTime(LocalDateTime.now());

            tokenService.multiWin(winner, loser);
            tokenService.multiLoss(loser);
            tokenService.scheduleTokenReset(loser);
            rankService.handleRankAfterMatch(winner, loser);

            // Notify both
            notificationService.sendRaceUpdate(winner.getUsername(),
                new RaceUpdateMessage(match.getId(), winner.getUsername(),
                    0, 0, true, match.getPlayer1CompletionMs()));
            notificationService.sendRaceUpdate(loser.getUsername(),
                new RaceUpdateMessage(match.getId(), loser.getUsername(),
                    0, 0, true, match.getPlayer2CompletionMs()));
        }

        matchRepository.save(match);
    }

}
