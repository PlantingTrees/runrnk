package com.runrnk.application.services;

import com.runrnk.application.enums.Rank;
import com.runrnk.application.models.*;
import com.runrnk.application.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RankService {

    private final UserRepository userRepository;

    public void handleRankAfterMatch(UserModel winner, UserModel loser) {
        // Loser loses UNDEFEATED permanently if they had it
        if (loser.getRank() == Rank.UNDEFEATED) {
            loser.setRank(Rank.MILER);
        }

        // Promote winner
        promoteRank(winner);

        // Demote loser
        demoteRank(loser);

        userRepository.save(winner);
        userRepository.save(loser);
    }

    private void promoteRank(UserModel user) {
        switch (user.getRank()) {
            case TODDLER -> user.setRank(Rank.WALKER);
            case WALKER -> user.setRank(Rank.MILER);
            case MILER -> {
                // Only becomes UNDEFEATED if they have never lost
                if (!user.isHasEverLost()) {
                    user.setRank(Rank.UNDEFEATED);
                }
                // stays MILER if they have lost before
            }
            case UNDEFEATED -> {
                // already at top, stays UNDEFEATED
            }
        }
    }

    private void demoteRank(UserModel user) {
        switch (user.getRank()) {
            case UNDEFEATED -> user.setRank(Rank.MILER); // handled above but safe
            case MILER -> user.setRank(Rank.WALKER);
            case WALKER -> user.setRank(Rank.TODDLER);
            case TODDLER -> {
                // already at bottom, stays TODDLER
            }
        }
    }
}