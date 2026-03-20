package e205.eyespeak.domain.setting.constant;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum DwellTimePreset {

    SHORT(600, "짧게"),
    DEFAULT(1000, "기본");

    private final int ms;
    private final String label;

    public static DwellTimePreset fromMs(int ms) {
        return Arrays.stream(values())
                .filter(p -> p.ms == ms)
                .findFirst()
                .orElse(null);
    }

    public static boolean isValid(int ms) {
        return fromMs(ms) != null;
    }
}
