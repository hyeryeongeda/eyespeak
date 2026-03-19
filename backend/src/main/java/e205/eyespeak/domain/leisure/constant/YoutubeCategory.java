package e205.eyespeak.domain.leisure.constant;

import java.util.Map;

public class YoutubeCategory {

    private static final Map<String, String> CATEGORIES = Map.ofEntries(
            Map.entry("sports", "스포츠"),
            Map.entry("news", "뉴스"),
            Map.entry("music", "음악"),
            Map.entry("radio", "라디오"),
            Map.entry("audiobook", "오디오북")
    );

    public static boolean isValid(String categoryId) {
        return categoryId != null && CATEGORIES.containsKey(categoryId);
    }

    public static String getName(String categoryId) {
        return CATEGORIES.get(categoryId);
    }

    private YoutubeCategory() {
    }
}
