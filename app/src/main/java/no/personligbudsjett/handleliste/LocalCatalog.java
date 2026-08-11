package no.personligbudsjett.handleliste;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Small offline catalog used only for quick manual item entry. */
public final class LocalCatalog {
    private LocalCatalog() {}

    public static final class Product {
        public final String name;
        public final String category;
        public final String icon;
        public final String unit;

        public Product(String name, String category, String icon, String unit) {
            this.name = name;
            this.category = category;
            this.icon = icon;
            this.unit = unit;
        }
    }

    public static final class Category {
        public final String id;
        public final String title;
        public final String icon;
        public final String section;
        public final boolean quick;
        public final List<Product> products;

        public Category(String id, String title, String icon, String section, boolean quick, Product... products) {
            this.id = id;
            this.title = title;
            this.icon = icon;
            this.section = section;
            this.quick = quick;
            this.products = Collections.unmodifiableList(Arrays.asList(products));
        }
    }

    private static Product p(String name, String category, String icon) {
        return new Product(name, category, icon, "stk");
    }

    private static final List<Category> CATEGORIES = Collections.unmodifiableList(Arrays.asList(
        // Quick filters
        new Category("vegetarian", "Vegetar", "🥗", "HURTIGVALG", true,
            p("Falafel", "Vegetar", "🧆"), p("Vegetarburger", "Vegetar", "🍔"), p("Tofu", "Vegetar", "◻️"),
            p("Linser", "Vegetar", "🫘"), p("Kikerter", "Vegetar", "🫘"), p("Halloumi", "Vegetar", "🧀"),
            p("Grønnsaksblanding", "Vegetar", "🥦"), p("Vegetarpølser", "Vegetar", "🌭"), p("Hummus", "Vegetar", "🥣")),
        new Category("vegan", "Vegan", "🌱", "HURTIGVALG", true,
            p("Havremelk", "Vegan", "🥛"), p("Soyamelk", "Vegan", "🥛"), p("Tofu", "Vegan", "◻️"),
            p("Kikerter", "Vegan", "🫘"), p("Linser", "Vegan", "🫘"), p("Vegansk pålegg", "Vegan", "🥪"),
            p("Plantebasert yoghurt", "Vegan", "🥣"), p("Vegansk ost", "Vegan", "🧀"), p("Nøttesmør", "Vegan", "🥜")),
        new Category("keto", "Keto", "🍳", "HURTIGVALG", true,
            p("Egg", "Keto", "🥚"), p("Avokado", "Keto", "🥑"), p("Bacon", "Keto", "🥓"),
            p("Kyllingfilet", "Keto", "🍗"), p("Laks", "Keto", "🐟"), p("Ost", "Keto", "🧀"),
            p("Mandler", "Keto", "🥜"), p("Brokkoli", "Keto", "🥦"), p("Fløte", "Keto", "🥛")),
        new Category("glutenfree", "Glutenfri", "🌾", "HURTIGVALG", true,
            p("Glutenfritt brød", "Glutenfri", "🍞"), p("Glutenfri pasta", "Glutenfri", "🍝"), p("Riskaker", "Glutenfri", "🍘"),
            p("Maismel", "Glutenfri", "🌽"), p("Havregryn glutenfri", "Glutenfri", "🥣"), p("Glutenfrie knekkebrød", "Glutenfri", "🍞"),
            p("Ris", "Glutenfri", "🍚"), p("Poteter", "Glutenfri", "🥔")),
        new Category("protein", "Proteinrik", "🏋️", "HURTIGVALG", true,
            p("Kyllingfilet", "Proteinrik", "🍗"), p("Karbonadedeig", "Proteinrik", "🥩"), p("Egg", "Proteinrik", "🥚"),
            p("Cottage cheese", "Proteinrik", "🥣"), p("Skyr", "Proteinrik", "🥣"), p("Tunfisk", "Proteinrik", "🐟"),
            p("Laks", "Proteinrik", "🐟"), p("Bønner", "Proteinrik", "🫘"), p("Proteinmelk", "Proteinrik", "🥛")),
        new Category("freezer", "Frys", "❄️", "HURTIGVALG", true,
            p("Frosne grønnsaker", "Frys", "🥦"), p("Frosne bær", "Frys", "🫐"), p("Pizza", "Frys", "🍕"),
            p("Is", "Frys", "🍦"), p("Fiskefileter", "Frys", "🐟"), p("Pommes frites", "Frys", "🍟"),
            p("Frosne rundstykker", "Frys", "🥖"), p("Frossen middag", "Frys", "🍽️")),
        new Category("popular", "Populært", "📈", "HURTIGVALG", true,
            p("Melk", "Meieri & egg", "🥛"), p("Brød", "Bakeri", "🍞"), p("Egg", "Meieri & egg", "🥚"),
            p("Kjøttdeig", "Kjøtt & fisk", "🥩"), p("Bananer", "Frukt & grønt", "🍌"), p("Ost", "Meieri & egg", "🧀"),
            p("Kaffe", "Kaffe & te", "☕"), p("Poteter", "Frukt & grønt", "🥔"), p("Smør", "Meieri & egg", "🧈")),

        // Food
        new Category("fruitveg", "Frukt & grønt", "🍅", "MAT", false,
            p("Bananer", "Frukt & grønt", "🍌"), p("Epler", "Frukt & grønt", "🍎"), p("Tomater", "Frukt & grønt", "🍅"),
            p("Agurk", "Frukt & grønt", "🥒"), p("Paprika", "Frukt & grønt", "🫑"), p("Poteter", "Frukt & grønt", "🥔"),
            p("Løk", "Frukt & grønt", "🧅"), p("Gulrøtter", "Frukt & grønt", "🥕"), p("Brokkoli", "Frukt & grønt", "🥦"),
            p("Avokado", "Frukt & grønt", "🥑"), p("Druer", "Frukt & grønt", "🍇"), p("Appelsiner", "Frukt & grønt", "🍊")),
        new Category("bakery", "Bakeri", "🥖", "MAT", false,
            p("Brød", "Bakeri", "🍞"), p("Rundstykker", "Bakeri", "🥖"), p("Knekkebrød", "Bakeri", "🍞"),
            p("Tortilla", "Bakeri", "🫓"), p("Pitabrød", "Bakeri", "🫓"), p("Baguette", "Bakeri", "🥖"),
            p("Hamburgerbrød", "Bakeri", "🍔"), p("Pølsebrød", "Bakeri", "🌭")),
        new Category("baking", "Bakevarer", "🧁", "MAT", false,
            p("Hvetemel", "Bakevarer", "🌾"), p("Sukker", "Bakevarer", "🧂"), p("Bakepulver", "Bakevarer", "🧁"),
            p("Vaniljesukker", "Bakevarer", "🧁"), p("Gjær", "Bakevarer", "🍞"), p("Kakao", "Bakevarer", "🍫"),
            p("Melis", "Bakevarer", "🧁"), p("Sjokolade", "Bakevarer", "🍫")),
        new Category("dairy", "Meieri & egg", "🧀", "MAT", false,
            p("Melk", "Meieri & egg", "🥛"), p("Egg", "Meieri & egg", "🥚"), p("Smør", "Meieri & egg", "🧈"),
            p("Ost", "Meieri & egg", "🧀"), p("Yoghurt", "Meieri & egg", "🥣"), p("Fløte", "Meieri & egg", "🥛"),
            p("Rømme", "Meieri & egg", "🥣"), p("Cottage cheese", "Meieri & egg", "🥣")),
        new Category("drygoods", "Tørrvarer", "🍝", "MAT", false,
            p("Ris", "Tørrvarer", "🍚"), p("Pasta", "Tørrvarer", "🍝"), p("Havregryn", "Tørrvarer", "🥣"),
            p("Hermetiske tomater", "Tørrvarer", "🥫"), p("Bønner", "Tørrvarer", "🫘"), p("Kikerter", "Tørrvarer", "🫘"),
            p("Linser", "Tørrvarer", "🫘"), p("Nudler", "Tørrvarer", "🍜"), p("Buljong", "Tørrvarer", "🧂")),
        new Category("ready", "Ferdigmat", "🥟", "MAT", false,
            p("Pizza", "Ferdigmat", "🍕"), p("Lasagne", "Ferdigmat", "🍝"), p("Suppe", "Ferdigmat", "🥣"),
            p("Ferdigsalat", "Ferdigmat", "🥗"), p("Ferdigmiddag", "Ferdigmat", "🍽️"), p("Sushi", "Ferdigmat", "🍣"),
            p("Wrap", "Ferdigmat", "🌯"), p("Pai", "Ferdigmat", "🥧")),
        new Category("meatfish", "Kjøtt & fisk", "🥩", "MAT", false,
            p("Kjøttdeig", "Kjøtt & fisk", "🥩"), p("Karbonadedeig", "Kjøtt & fisk", "🥩"), p("Kyllingfilet", "Kjøtt & fisk", "🍗"),
            p("Bacon", "Kjøtt & fisk", "🥓"), p("Pølser", "Kjøtt & fisk", "🌭"), p("Laks", "Kjøtt & fisk", "🐟"),
            p("Torsk", "Kjøtt & fisk", "🐟"), p("Fiskekaker", "Kjøtt & fisk", "🐟")),
        new Category("snacks", "Snacks & godteri", "🍫", "MAT", false,
            p("Potetgull", "Snacks & godteri", "🥔"), p("Sjokolade", "Snacks & godteri", "🍫"), p("Nøtter", "Snacks & godteri", "🥜"),
            p("Popcorn", "Snacks & godteri", "🍿"), p("Kjeks", "Snacks & godteri", "🍪"), p("Godteri", "Snacks & godteri", "🍬")),

        // Beverages
        new Category("beverages", "Drikke", "🥤", "DRIKKE", false,
            p("Mineralvann", "Drikke", "🥤"), p("Vann", "Drikke", "💧"), p("Saft", "Drikke", "🧃"),
            p("Energidrikk", "Drikke", "⚡"), p("Iste", "Drikke", "🧋"), p("Kakao", "Drikke", "☕")),
        new Category("coffee", "Kaffe & te", "☕", "DRIKKE", false,
            p("Kaffe", "Kaffe & te", "☕"), p("Kaffebønner", "Kaffe & te", "☕"), p("Te", "Kaffe & te", "🫖"),
            p("Kaffefilter", "Kaffe & te", "☕"), p("Kakao", "Kaffe & te", "☕")),
        new Category("juice", "Juice & saft", "🧃", "DRIKKE", false,
            p("Appelsinjuice", "Juice & saft", "🍊"), p("Eplejuice", "Juice & saft", "🍎"), p("Multijuice", "Juice & saft", "🧃"),
            p("Solbærsaft", "Juice & saft", "🧃"), p("Husholdningssaft", "Juice & saft", "🧃")),

        // Personal care
        new Category("care", "Personlig pleie", "🧴", "PERSONLIG PLEIE OG HELSE", false,
            p("Sjampo", "Personlig pleie", "🧴"), p("Balsam", "Personlig pleie", "🧴"), p("Såpe", "Personlig pleie", "🧼"),
            p("Tannkrem", "Personlig pleie", "🪥"), p("Deodorant", "Personlig pleie", "🧴"), p("Toalettpapir", "Personlig pleie", "🧻")),
        new Category("baby", "Baby", "🧸", "PERSONLIG PLEIE OG HELSE", false,
            p("Bleier", "Baby", "👶"), p("Våtservietter", "Baby", "🧻"), p("Barnemat", "Baby", "🥣"),
            p("Morsmelkerstatning", "Baby", "🍼"), p("Babygrøt", "Baby", "🥣")),
        new Category("health", "Helse", "🩹", "PERSONLIG PLEIE OG HELSE", false,
            p("Plaster", "Helse", "🩹"), p("Hånddesinfeksjon", "Helse", "🧴"), p("Bomull", "Helse", "☁️"),
            p("Papirlommetørklær", "Helse", "🤧"), p("Munnskyll", "Helse", "🦷")),

        // Home
        new Category("clothing", "Klær", "👕", "HJEM OG LIVSSTIL", false,
            p("Sokker", "Klær", "🧦"), p("T-skjorte", "Klær", "👕"), p("Undertøy", "Klær", "👚"), p("Strømpebukse", "Klær", "🧦")),
        new Category("homegarden", "Hjem & hage", "💐", "HJEM OG LIVSSTIL", false,
            p("Lyspærer", "Hjem & hage", "💡"), p("Batterier", "Hjem & hage", "🔋"), p("Blomster", "Hjem & hage", "💐"),
            p("Stearinlys", "Hjem & hage", "🕯️"), p("Aluminiumsfolie", "Hjem & hage", "📦")),
        new Category("cleaning", "Rengjøring & vask", "🧴", "HJEM OG LIVSSTIL", false,
            p("Oppvaskmiddel", "Rengjøring & vask", "🧴"), p("Vaskemiddel", "Rengjøring & vask", "🧺"), p("Tøymykner", "Rengjøring & vask", "🧺"),
            p("Universalrens", "Rengjøring & vask", "🧽"), p("Søppelposer", "Rengjøring & vask", "🗑️"), p("Kjøkkenpapir", "Rengjøring & vask", "🧻")),
        new Category("stationery", "Kontor", "📚", "HJEM OG LIVSSTIL", false,
            p("Kulepenner", "Kontor", "🖊️"), p("Notatblokk", "Kontor", "📒"), p("Konvolutter", "Kontor", "✉️"), p("Tape", "Kontor", "📎")),

        new Category("pets", "Kjæledyr", "🐾", "ANNET", false,
            p("Kattemat", "Kjæledyr", "🐈"), p("Hundemat", "Kjæledyr", "🐕"), p("Kattesand", "Kjæledyr", "🐈"), p("Dyregodteri", "Kjæledyr", "🐾"))
    ));

    public static List<Category> quickCategories() {
        List<Category> out = new ArrayList<>();
        for (Category c : CATEGORIES) if (c.quick) out.add(c);
        return out;
    }

    public static List<String> sections() {
        return Arrays.asList("MAT", "DRIKKE", "PERSONLIG PLEIE OG HELSE", "HJEM OG LIVSSTIL", "ANNET");
    }

    public static List<Category> categoriesForSection(String section) {
        List<Category> out = new ArrayList<>();
        for (Category c : CATEGORIES) if (!c.quick && c.section.equals(section)) out.add(c);
        return out;
    }

    public static Category find(String id) {
        for (Category c : CATEGORIES) if (c.id.equals(id)) return c;
        return null;
    }

    public static List<Product> search(String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        if (q.isEmpty()) return Collections.emptyList();
        List<Product> out = new ArrayList<>();
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (Category c : CATEGORIES) {
            for (Product p : c.products) {
                if (p.name.toLowerCase().contains(q) && seen.add(p.name.toLowerCase())) out.add(p);
            }
        }
        return out;
    }
}
