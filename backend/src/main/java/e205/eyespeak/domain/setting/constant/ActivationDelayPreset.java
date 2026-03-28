package e205.eyespeak.domain.setting.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum ActivationDelayPreset {

    NONE(0, "없음"),
    SHORT(600, "짧게"),
    MEDIUM(1000, "중간"),
    LONG(1600, "길게");

    private final int ms;
    private final String label;

    public static ActivationDelayPreset fromMs(int ms) {
        return Arrays.stream(values())
                .filter(p -> p.ms == ms)
                .findFirst()
                .orElse(null);
    }

    public static boolean isValid(int ms) {
        return fromMs(ms) != null;
    }
}
