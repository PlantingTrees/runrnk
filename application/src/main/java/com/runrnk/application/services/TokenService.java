package com.runrnk.application.services;

import com.runrnk.application.models.*;
import com.runrnk.application.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final UserRepository userRepository;

    // Called when a game starts — deduct tokens from both players
    public void deductTokens(UserModel user) {
        user.setTokens(0);
        userRepository.save(user);
    }

    // Solo win — beat yesterday's best time
    public void soloWin(UserModel user) {
        user.setTokens(100);
        userRepository.save(user);
    }

    // Solo loss — tokens already gone, nothing to do
    public void soloLoss(UserModel user) {
        // tokens already 0, just save any state changes
        userRepository.save(user);
    }

    // Multi win — get your 100 back + 50 from loser
    public void multiWin(UserModel winner, UserModel loser) {
        winner.setTokens(winner.getTokens() + 150);
        userRepository.save(winner);
    }

    // Multi loss — tokens already consumed
    public void multiLoss(UserModel loser) {
        loser.setHasEverLost(true);
        userRepository.save(loser);
    }

    // Runs every minute, checks for users who need midnight reset
    @Scheduled(fixedRate = 60000)
    public void midnightTokenReset() {
        List<UserModel> users = userRepository.findAll();

        for (UserModel user : users) {
            if (user.getTokens() > 0) continue;
            if (user.getTimezone() == null) continue;
            if (user.getTokenResetTime() == null) continue;

            ZonedDateTime now = ZonedDateTime.now(ZoneId.of(user.getTimezone()));
            ZonedDateTime resetTime = user.getTokenResetTime()
                .atZone(ZoneId.of(user.getTimezone()));

            if (now.isAfter(resetTime)) {
                user.setTokens(100);
                // Set next reset to next midnight
                ZonedDateTime nextMidnight = now.toLocalDate()
                    .plusDays(1)
                    .atStartOfDay(ZoneId.of(user.getTimezone()));
                user.setTokenResetTime(nextMidnight.toLocalDateTime());
                userRepository.save(user);
            }
        }
    }

    // Call this when a user first runs out of tokens
    public void scheduleTokenReset(UserModel user) {
        if (user.getTimezone() == null) user.setTimezone("UTC");

        ZonedDateTime nextMidnight = ZonedDateTime.now(ZoneId.of(user.getTimezone()))
            .toLocalDate()
            .plusDays(1)
            .atStartOfDay(ZoneId.of(user.getTimezone()));

        user.setTokenResetTime(nextMidnight.toLocalDateTime());
        userRepository.save(user);
    }
}