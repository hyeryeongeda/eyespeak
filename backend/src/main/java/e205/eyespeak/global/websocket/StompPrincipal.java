package e205.eyespeak.global.websocket;

import e205.eyespeak.global.enums.Role;
import lombok.Getter;

import java.security.Principal;

@Getter
public class StompPrincipal implements Principal {

    private final Long userId;
    private final Role role;

    public StompPrincipal(Long userId, Role role) {
        this.userId = userId;
        this.role = role;
    }

    @Override
    public String getName() {
        return String.valueOf(userId);
    }
}
