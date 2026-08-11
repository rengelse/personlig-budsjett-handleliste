package no.personligbudsjett.handleliste;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Offline product catalog used by manual, text and voice search. */
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
        new Category("vegetarian", "Vegetar", "🥗", "HURTIGVALG", true,
            p("Falafel", "Vegetar", "🧆"),
            p("Vegetarburger", "Vegetar", "🍔"),
            p("Tofu", "Vegetar", "◻️"),
            p("Tempeh", "Vegetar", "◻️"),
            p("Linser", "Vegetar", "🫘"),
            p("Kikerter", "Vegetar", "🫘"),
            p("Kidneybønner", "Vegetar", "🫘"),
            p("Svarte bønner", "Vegetar", "🫘"),
            p("Halloumi", "Vegetar", "🧀"),
            p("Hummus", "Vegetar", "🥣"),
            p("Vegetarpølser", "Vegetar", "🌭"),
            p("Vegetarkjøttdeig", "Vegetar", "🥩"),
            p("Grønnsaksburger", "Vegetar", "🍔"),
            p("Quinoa", "Vegetar", "🌾"),
            p("Couscous", "Vegetar", "🌾"),
            p("Avokado", "Vegetar", "🥑"),
            p("Sopp", "Vegetar", "🍄"),
            p("Søtpotet", "Vegetar", "🍠")
        ),
        new Category("vegan", "Vegan", "🌱", "HURTIGVALG", true,
            p("Havremelk", "Vegan", "🥛"),
            p("Soyamelk", "Vegan", "🥛"),
            p("Mandelmelk", "Vegan", "🥛"),
            p("Tofu", "Vegan", "◻️"),
            p("Tempeh", "Vegan", "◻️"),
            p("Kikerter", "Vegan", "🫘"),
            p("Linser", "Vegan", "🫘"),
            p("Vegansk pålegg", "Vegan", "🥪"),
            p("Plantebasert yoghurt", "Vegan", "🥣"),
            p("Vegansk ost", "Vegan", "🧀"),
            p("Nøttesmør", "Vegan", "🥜"),
            p("Hummus", "Vegan", "🥣"),
            p("Tahini", "Vegan", "🥜"),
            p("Kokosmelk", "Vegan", "🥥"),
            p("Chiafrø", "Vegan", "🌱"),
            p("Quinoa", "Vegan", "🌾"),
            p("Vegansk burger", "Vegan", "🍔"),
            p("Veganske pølser", "Vegan", "🌭")
        ),
        new Category("keto", "Keto", "🍳", "HURTIGVALG", true,
            p("Egg", "Keto", "🥚"),
            p("Avokado", "Keto", "🥑"),
            p("Bacon", "Keto", "🥓"),
            p("Kyllingfilet", "Keto", "🍗"),
            p("Laks", "Keto", "🐟"),
            p("Ost", "Keto", "🧀"),
            p("Mandler", "Keto", "🥜"),
            p("Valnøtter", "Keto", "🥜"),
            p("Brokkoli", "Keto", "🥦"),
            p("Blomkål", "Keto", "🥦"),
            p("Fløte", "Keto", "🥛"),
            p("Smør", "Keto", "🧈"),
            p("Oliven", "Keto", "🫒"),
            p("Spinat", "Keto", "🥬"),
            p("Squash", "Keto", "🥒"),
            p("Kjøttdeig", "Keto", "🥩"),
            p("Reker", "Keto", "🦐"),
            p("Majones", "Keto", "🥣")
        ),
        new Category("glutenfree", "Glutenfri", "🚫🌾", "HURTIGVALG", true,
            p("Glutenfritt brød", "Glutenfri", "🍞"),
            p("Glutenfri pasta", "Glutenfri", "🍝"),
            p("Riskaker", "Glutenfri", "🍘"),
            p("Maismel", "Glutenfri", "🌽"),
            p("Havregryn glutenfri", "Glutenfri", "🥣"),
            p("Glutenfrie knekkebrød", "Glutenfri", "🍞"),
            p("Ris", "Glutenfri", "🍚"),
            p("Poteter", "Glutenfri", "🥔"),
            p("Quinoa", "Glutenfri", "🌾"),
            p("Mais", "Glutenfri", "🌽"),
            p("Bokhvetemel", "Glutenfri", "🌾"),
            p("Mandelmel", "Glutenfri", "🥜"),
            p("Glutenfri tortilla", "Glutenfri", "🫓"),
            p("Glutenfri pizza", "Glutenfri", "🍕"),
            p("Glutenfri müsli", "Glutenfri", "🥣")
        ),
        new Category("protein", "Proteinrik", "🏋️", "HURTIGVALG", true,
            p("Kyllingfilet", "Proteinrik", "🍗"),
            p("Karbonadedeig", "Proteinrik", "🥩"),
            p("Egg", "Proteinrik", "🥚"),
            p("Cottage cheese", "Proteinrik", "🥣"),
            p("Skyr", "Proteinrik", "🥣"),
            p("Tunfisk", "Proteinrik", "🐟"),
            p("Laks", "Proteinrik", "🐟"),
            p("Bønner", "Proteinrik", "🫘"),
            p("Proteinmelk", "Proteinrik", "🥛"),
            p("Kesam", "Proteinrik", "🥣"),
            p("Kalkunpålegg", "Proteinrik", "🍗"),
            p("Reker", "Proteinrik", "🦐"),
            p("Linser", "Proteinrik", "🫘"),
            p("Kikerter", "Proteinrik", "🫘"),
            p("Gresk yoghurt", "Proteinrik", "🥣"),
            p("Makrell i tomat", "Proteinrik", "🐟")
        ),
        new Category("freezer", "Frys", "❄️", "HURTIGVALG", true,
            p("Frosne grønnsaker", "Frys", "🥦"),
            p("Frosne bær", "Frys", "🫐"),
            p("Pizza", "Frys", "🍕"),
            p("Is", "Frys", "🍦"),
            p("Fiskefileter", "Frys", "🐟"),
            p("Pommes frites", "Frys", "🍟"),
            p("Frosne rundstykker", "Frys", "🥖"),
            p("Frossen middag", "Frys", "🍽️"),
            p("Frosne erter", "Frys", "🟢"),
            p("Frossen spinat", "Frys", "🥬"),
            p("Frosne reker", "Frys", "🦐"),
            p("Fiskepinner", "Frys", "🐟"),
            p("Frossen pizza", "Frys", "🍕"),
            p("Frosne urter", "Frys", "🌿"),
            p("Frosne pommes noisettes", "Frys", "🥔")
        ),
        new Category("popular", "Populært", "📈", "HURTIGVALG", true,
            p("Melk", "Meieri & egg", "🥛"),
            p("Brød", "Bakeri", "🍞"),
            p("Egg", "Meieri & egg", "🥚"),
            p("Kjøttdeig", "Kjøtt & fisk", "🥩"),
            p("Bananer", "Frukt & grønt", "🍌"),
            p("Ost", "Meieri & egg", "🧀"),
            p("Kaffe", "Kaffe & te", "☕"),
            p("Poteter", "Frukt & grønt", "🥔"),
            p("Smør", "Meieri & egg", "🧈"),
            p("Paprika", "Frukt & grønt", "🫑"),
            p("Agurk", "Frukt & grønt", "🥒"),
            p("Yoghurt", "Meieri & egg", "🥣"),
            p("Kyllingfilet", "Kjøtt & fisk", "🍗"),
            p("Ris", "Tørrvarer", "🍚"),
            p("Pasta", "Tørrvarer", "🍝"),
            p("Toalettpapir", "Personlig pleie", "🧻")
        ),
        new Category("fruitveg", "Frukt & grønt", "🍅", "MAT", false,
            p("Epler", "Frukt & grønt", "🍎"),
            p("Bananer", "Frukt & grønt", "🍌"),
            p("Appelsiner", "Frukt & grønt", "🍊"),
            p("Mandariner", "Frukt & grønt", "🍊"),
            p("Sitron", "Frukt & grønt", "🍋"),
            p("Lime", "Frukt & grønt", "🍋"),
            p("Pærer", "Frukt & grønt", "🍐"),
            p("Druer", "Frukt & grønt", "🍇"),
            p("Jordbær", "Frukt & grønt", "🍓"),
            p("Blåbær", "Frukt & grønt", "🫐"),
            p("Bringebær", "Frukt & grønt", "🫐"),
            p("Bjørnebær", "Frukt & grønt", "🫐"),
            p("Kiwi", "Frukt & grønt", "🥝"),
            p("Mango", "Frukt & grønt", "🥭"),
            p("Ananas", "Frukt & grønt", "🍍"),
            p("Melon", "Frukt & grønt", "🍈"),
            p("Vannmelon", "Frukt & grønt", "🍉"),
            p("Fersken", "Frukt & grønt", "🍑"),
            p("Nektarin", "Frukt & grønt", "🍑"),
            p("Plommer", "Frukt & grønt", "🍑"),
            p("Avokado", "Frukt & grønt", "🥑"),
            p("Tomater", "Frukt & grønt", "🍅"),
            p("Cherrytomater", "Frukt & grønt", "🍅"),
            p("Agurk", "Frukt & grønt", "🥒"),
            p("Paprika", "Frukt & grønt", "🫑"),
            p("Chili", "Frukt & grønt", "🌶️"),
            p("Poteter", "Frukt & grønt", "🥔"),
            p("Søtpotet", "Frukt & grønt", "🍠"),
            p("Gulrøtter", "Frukt & grønt", "🥕"),
            p("Pastinakk", "Frukt & grønt", "🥕"),
            p("Kålrot", "Frukt & grønt", "🥕"),
            p("Sellerirot", "Frukt & grønt", "🥬"),
            p("Brokkoli", "Frukt & grønt", "🥦"),
            p("Blomkål", "Frukt & grønt", "🥦"),
            p("Rosenkål", "Frukt & grønt", "🥬"),
            p("Hodekål", "Frukt & grønt", "🥬"),
            p("Rødkål", "Frukt & grønt", "🥬"),
            p("Spisskål", "Frukt & grønt", "🥬"),
            p("Grønnkål", "Frukt & grønt", "🥬"),
            p("Spinat", "Frukt & grønt", "🥬"),
            p("Hjertesalat", "Frukt & grønt", "🥬"),
            p("Isbergsalat", "Frukt & grønt", "🥬"),
            p("Ruccola", "Frukt & grønt", "🥬"),
            p("Vårløk", "Frukt & grønt", "🧅"),
            p("Gul løk", "Frukt & grønt", "🧅"),
            p("Rødløk", "Frukt & grønt", "🧅"),
            p("Hvitløk", "Frukt & grønt", "🧄"),
            p("Purreløk", "Frukt & grønt", "🧅"),
            p("Champignon", "Frukt & grønt", "🍄"),
            p("Aromasopp", "Frukt & grønt", "🍄"),
            p("Squash", "Frukt & grønt", "🥒"),
            p("Aubergine", "Frukt & grønt", "🍆"),
            p("Mais", "Frukt & grønt", "🌽"),
            p("Asparges", "Frukt & grønt", "🥦"),
            p("Stangselleri", "Frukt & grønt", "🥬"),
            p("Sukkererter", "Frukt & grønt", "🫛"),
            p("Grønne bønner", "Frukt & grønt", "🫛"),
            p("Ingefær", "Frukt & grønt", "🫚"),
            p("Dill", "Frukt & grønt", "🌿"),
            p("Persille", "Frukt & grønt", "🌿"),
            p("Koriander", "Frukt & grønt", "🌿"),
            p("Basilikum", "Frukt & grønt", "🌿"),
            p("Mynte", "Frukt & grønt", "🌿")
        ),
        new Category("bakery", "Bakeri", "🥖", "MAT", false,
            p("Brød", "Bakeri", "🍞"),
            p("Grovbrød", "Bakeri", "🍞"),
            p("Loff", "Bakeri", "🍞"),
            p("Surdeigsbrød", "Bakeri", "🍞"),
            p("Rundstykker", "Bakeri", "🥖"),
            p("Baguette", "Bakeri", "🥖"),
            p("Ciabatta", "Bakeri", "🥖"),
            p("Focaccia", "Bakeri", "🍞"),
            p("Knekkebrød", "Bakeri", "🍞"),
            p("Tortilla", "Bakeri", "🫓"),
            p("Pitabrød", "Bakeri", "🫓"),
            p("Naan", "Bakeri", "🫓"),
            p("Hamburgerbrød", "Bakeri", "🍔"),
            p("Pølsebrød", "Bakeri", "🌭"),
            p("Croissant", "Bakeri", "🥐"),
            p("Bagel", "Bakeri", "🥯"),
            p("Polarbrød", "Bakeri", "🍞"),
            p("Lomper", "Bakeri", "🫓"),
            p("Potetlefse", "Bakeri", "🫓"),
            p("Wraps", "Bakeri", "🌯")
        ),
        new Category("baking", "Bakevarer", "🧁", "MAT", false,
            p("Hvetemel", "Bakevarer", "🌾"),
            p("Sammalt hvete", "Bakevarer", "🌾"),
            p("Rugmel", "Bakevarer", "🌾"),
            p("Speltmel", "Bakevarer", "🌾"),
            p("Maismel", "Bakevarer", "🌽"),
            p("Mandelmel", "Bakevarer", "🥜"),
            p("Sukker", "Bakevarer", "🧂"),
            p("Brunt sukker", "Bakevarer", "🧂"),
            p("Melis", "Bakevarer", "🧁"),
            p("Bakepulver", "Bakevarer", "🧁"),
            p("Natron", "Bakevarer", "🧁"),
            p("Vaniljesukker", "Bakevarer", "🧁"),
            p("Tørrgjær", "Bakevarer", "🍞"),
            p("Fersk gjær", "Bakevarer", "🍞"),
            p("Kakao", "Bakevarer", "🍫"),
            p("Kokesjokolade", "Bakevarer", "🍫"),
            p("Sjokoladebiter", "Bakevarer", "🍫"),
            p("Kokosmasse", "Bakevarer", "🥥"),
            p("Marsipan", "Bakevarer", "🍬"),
            p("Gelatin", "Bakevarer", "🧁"),
            p("Kakepynt", "Bakevarer", "🧁"),
            p("Kanel", "Bakevarer", "🧂"),
            p("Kardemomme", "Bakevarer", "🧂"),
            p("Vaniljeessens", "Bakevarer", "🧁")
        ),
        new Category("dairy", "Meieri & egg", "🧀", "MAT", false,
            p("Helmelk", "Meieri & egg", "🥛"),
            p("Lettmelk", "Meieri & egg", "🥛"),
            p("Skummet melk", "Meieri & egg", "🥛"),
            p("Laktosefri melk", "Meieri & egg", "🥛"),
            p("Havremelk", "Meieri & egg", "🥛"),
            p("Egg", "Meieri & egg", "🥚"),
            p("Smør", "Meieri & egg", "🧈"),
            p("Margarin", "Meieri & egg", "🧈"),
            p("Gulost", "Meieri & egg", "🧀"),
            p("Norvegia", "Meieri & egg", "🧀"),
            p("Jarlsberg", "Meieri & egg", "🧀"),
            p("Mozzarella", "Meieri & egg", "🧀"),
            p("Parmesan", "Meieri & egg", "🧀"),
            p("Fetaost", "Meieri & egg", "🧀"),
            p("Brunost", "Meieri & egg", "🧀"),
            p("Kremost", "Meieri & egg", "🧀"),
            p("Cottage cheese", "Meieri & egg", "🥣"),
            p("Kesam", "Meieri & egg", "🥣"),
            p("Rømme", "Meieri & egg", "🥣"),
            p("Crème fraîche", "Meieri & egg", "🥣"),
            p("Fløte", "Meieri & egg", "🥛"),
            p("Matfløte", "Meieri & egg", "🥛"),
            p("Yoghurt naturell", "Meieri & egg", "🥣"),
            p("Fruktyoghurt", "Meieri & egg", "🥣"),
            p("Gresk yoghurt", "Meieri & egg", "🥣"),
            p("Skyr", "Meieri & egg", "🥣")
        ),
        new Category("drygoods", "Tørrvarer", "🍝", "MAT", false,
            p("Ris", "Tørrvarer", "🍚"),
            p("Basmatiris", "Tørrvarer", "🍚"),
            p("Jasminris", "Tørrvarer", "🍚"),
            p("Fullkornsris", "Tørrvarer", "🍚"),
            p("Pasta", "Tørrvarer", "🍝"),
            p("Spagetti", "Tørrvarer", "🍝"),
            p("Penne", "Tørrvarer", "🍝"),
            p("Lasagneplater", "Tørrvarer", "🍝"),
            p("Nudler", "Tørrvarer", "🍜"),
            p("Couscous", "Tørrvarer", "🌾"),
            p("Bulgur", "Tørrvarer", "🌾"),
            p("Quinoa", "Tørrvarer", "🌾"),
            p("Havregryn", "Tørrvarer", "🥣"),
            p("Müsli", "Tørrvarer", "🥣"),
            p("Cornflakes", "Tørrvarer", "🥣"),
            p("Hermetiske tomater", "Tørrvarer", "🥫"),
            p("Tomatpuré", "Tørrvarer", "🥫"),
            p("Mais på boks", "Tørrvarer", "🌽"),
            p("Kidneybønner", "Tørrvarer", "🫘"),
            p("Svarte bønner", "Tørrvarer", "🫘"),
            p("Hvite bønner", "Tørrvarer", "🫘"),
            p("Kikerter", "Tørrvarer", "🫘"),
            p("Linser", "Tørrvarer", "🫘"),
            p("Tunfisk på boks", "Tørrvarer", "🥫"),
            p("Makrell i tomat", "Tørrvarer", "🐟"),
            p("Kokosmelk", "Tørrvarer", "🥥"),
            p("Buljongterninger", "Tørrvarer", "🧂"),
            p("Salt", "Tørrvarer", "🧂"),
            p("Pepper", "Tørrvarer", "🧂"),
            p("Olivenolje", "Tørrvarer", "🫒"),
            p("Rapsolje", "Tørrvarer", "🫒"),
            p("Eddik", "Tørrvarer", "🧴"),
            p("Soyasaus", "Tørrvarer", "🥣"),
            p("Ketchup", "Tørrvarer", "🍅"),
            p("Sennep", "Tørrvarer", "🥣"),
            p("Majones", "Tørrvarer", "🥣")
        ),
        new Category("ready", "Ferdigmat", "🥟", "MAT", false,
            p("Frossenpizza", "Ferdigmat", "🍕"),
            p("Fersk pizza", "Ferdigmat", "🍕"),
            p("Lasagne", "Ferdigmat", "🍝"),
            p("Fjordland middag", "Ferdigmat", "🍽️"),
            p("Ferdigsuppe", "Ferdigmat", "🥣"),
            p("Ferdigsalat", "Ferdigmat", "🥗"),
            p("Sushi", "Ferdigmat", "🍣"),
            p("Wrap", "Ferdigmat", "🌯"),
            p("Pai", "Ferdigmat", "🥧"),
            p("Pasta ferdigrett", "Ferdigmat", "🍝"),
            p("Wok ferdigrett", "Ferdigmat", "🥡"),
            p("Hamburger ferdig", "Ferdigmat", "🍔"),
            p("Kyllingvinger ferdig", "Ferdigmat", "🍗"),
            p("Potetmos ferdig", "Ferdigmat", "🥔"),
            p("Grøt", "Ferdigmat", "🥣"),
            p("Pannekaker", "Ferdigmat", "🥞")
        ),
        new Category("meatfish", "Kjøtt & fisk", "🥩", "MAT", false,
            p("Kjøttdeig", "Kjøtt & fisk", "🥩"),
            p("Karbonadedeig", "Kjøtt & fisk", "🥩"),
            p("Kyllingfilet", "Kjøtt & fisk", "🍗"),
            p("Kyllinglår", "Kjøtt & fisk", "🍗"),
            p("Kyllingvinger", "Kjøtt & fisk", "🍗"),
            p("Hel kylling", "Kjøtt & fisk", "🍗"),
            p("Svinefilet", "Kjøtt & fisk", "🥩"),
            p("Svinekoteletter", "Kjøtt & fisk", "🥩"),
            p("Nakkekoteletter", "Kjøtt & fisk", "🥩"),
            p("Biff", "Kjøtt & fisk", "🥩"),
            p("Entrecôte", "Kjøtt & fisk", "🥩"),
            p("Bacon", "Kjøtt & fisk", "🥓"),
            p("Pølser", "Kjøtt & fisk", "🌭"),
            p("Grillpølser", "Kjøtt & fisk", "🌭"),
            p("Kalkunpålegg", "Kjøtt & fisk", "🍗"),
            p("Skinke", "Kjøtt & fisk", "🥩"),
            p("Salami", "Kjøtt & fisk", "🥩"),
            p("Laks", "Kjøtt & fisk", "🐟"),
            p("Torsk", "Kjøtt & fisk", "🐟"),
            p("Sei", "Kjøtt & fisk", "🐟"),
            p("Ørret", "Kjøtt & fisk", "🐟"),
            p("Makrell", "Kjøtt & fisk", "🐟"),
            p("Fiskekaker", "Kjøtt & fisk", "🐟"),
            p("Fiskeboller", "Kjøtt & fisk", "🐟"),
            p("Fiskepinner", "Kjøtt & fisk", "🐟"),
            p("Reker", "Kjøtt & fisk", "🦐"),
            p("Blåskjell", "Kjøtt & fisk", "🦪")
        ),
        new Category("snacks", "Snacks & godteri", "🍫", "MAT", false,
            p("Potetgull", "Snacks & godteri", "🥔"),
            p("Tortillachips", "Snacks & godteri", "🌽"),
            p("Popcorn", "Snacks & godteri", "🍿"),
            p("Peanøtter", "Snacks & godteri", "🥜"),
            p("Mandler", "Snacks & godteri", "🥜"),
            p("Cashewnøtter", "Snacks & godteri", "🥜"),
            p("Sjokolade", "Snacks & godteri", "🍫"),
            p("Melkesjokolade", "Snacks & godteri", "🍫"),
            p("Mørk sjokolade", "Snacks & godteri", "🍫"),
            p("Godteri", "Snacks & godteri", "🍬"),
            p("Vingummi", "Snacks & godteri", "🍬"),
            p("Lakris", "Snacks & godteri", "🍬"),
            p("Kjeks", "Snacks & godteri", "🍪"),
            p("Cookies", "Snacks & godteri", "🍪"),
            p("Is", "Snacks & godteri", "🍦"),
            p("Proteinbar", "Snacks & godteri", "🍫"),
            p("Granola bar", "Snacks & godteri", "🍫")
        ),
        new Category("beverages", "Drikke", "🥤", "DRIKKE", false,
            p("Vann", "Drikke", "💧"),
            p("Kullsyrevann", "Drikke", "💧"),
            p("Mineralvann", "Drikke", "🥤"),
            p("Cola", "Drikke", "🥤"),
            p("Cola uten sukker", "Drikke", "🥤"),
            p("Brus", "Drikke", "🥤"),
            p("Energidrikk", "Drikke", "⚡"),
            p("Sportsdrikk", "Drikke", "🥤"),
            p("Iste", "Drikke", "🧋"),
            p("Kakao", "Drikke", "☕"),
            p("Smoothie", "Drikke", "🥤"),
            p("Kombucha", "Drikke", "🧋"),
            p("Tonic", "Drikke", "🥤"),
            p("Ingefærøl alkoholfri", "Drikke", "🥤")
        ),
        new Category("coffee", "Kaffe & te", "☕", "DRIKKE", false,
            p("Filterkaffe", "Kaffe & te", "☕"),
            p("Kaffebønner", "Kaffe & te", "☕"),
            p("Espressobønner", "Kaffe & te", "☕"),
            p("Pulverkaffe", "Kaffe & te", "☕"),
            p("Kaffekapsler", "Kaffe & te", "☕"),
            p("Kaffefilter", "Kaffe & te", "☕"),
            p("Sort te", "Kaffe & te", "🫖"),
            p("Grønn te", "Kaffe & te", "🫖"),
            p("Urte-te", "Kaffe & te", "🫖"),
            p("Chai", "Kaffe & te", "🫖"),
            p("Kakao", "Kaffe & te", "☕"),
            p("Kaffefløte", "Kaffe & te", "🥛"),
            p("Suketter", "Kaffe & te", "🧂")
        ),
        new Category("juice", "Juice & saft", "🧃", "DRIKKE", false,
            p("Appelsinjuice", "Juice & saft", "🍊"),
            p("Eplejuice", "Juice & saft", "🍎"),
            p("Multijuice", "Juice & saft", "🧃"),
            p("Ananasjuice", "Juice & saft", "🍍"),
            p("Mangojuice", "Juice & saft", "🥭"),
            p("Tranebærjuice", "Juice & saft", "🧃"),
            p("Solbærsaft", "Juice & saft", "🧃"),
            p("Bringebærsaft", "Juice & saft", "🧃"),
            p("Husholdningssaft", "Juice & saft", "🧃"),
            p("Sukkerfri saft", "Juice & saft", "🧃")
        ),
        new Category("care", "Personlig pleie", "🧴", "PERSONLIG PLEIE OG HELSE", false,
            p("Sjampo", "Personlig pleie", "🧴"),
            p("Balsam", "Personlig pleie", "🧴"),
            p("Dusjsåpe", "Personlig pleie", "🧼"),
            p("Håndsåpe", "Personlig pleie", "🧼"),
            p("Tannkrem", "Personlig pleie", "🪥"),
            p("Tannbørste", "Personlig pleie", "🪥"),
            p("Tanntråd", "Personlig pleie", "🦷"),
            p("Munnskyll", "Personlig pleie", "🦷"),
            p("Deodorant", "Personlig pleie", "🧴"),
            p("Barberskum", "Personlig pleie", "🪒"),
            p("Barberhøvel", "Personlig pleie", "🪒"),
            p("Ansiktskrem", "Personlig pleie", "🧴"),
            p("Håndkrem", "Personlig pleie", "🧴"),
            p("Body lotion", "Personlig pleie", "🧴"),
            p("Solkrem", "Personlig pleie", "☀️"),
            p("Bomullspads", "Personlig pleie", "☁️"),
            p("Q-tips", "Personlig pleie", "☁️"),
            p("Toalettpapir", "Personlig pleie", "🧻"),
            p("Bind", "Personlig pleie", "🩸"),
            p("Tamponger", "Personlig pleie", "🩸")
        ),
        new Category("baby", "Baby", "🧸", "PERSONLIG PLEIE OG HELSE", false,
            p("Bleier", "Baby", "👶"),
            p("Våtservietter", "Baby", "🧻"),
            p("Barnemat", "Baby", "🥣"),
            p("Morsmelkerstatning", "Baby", "🍼"),
            p("Babygrøt", "Baby", "🥣"),
            p("Fruktmos", "Baby", "🍎"),
            p("Babysjampo", "Baby", "🧴"),
            p("Babyolje", "Baby", "🧴"),
            p("Sinksalve", "Baby", "🧴"),
            p("Smekker", "Baby", "👶"),
            p("Tåteflasker", "Baby", "🍼"),
            p("Bleieposer", "Baby", "🗑️")
        ),
        new Category("health", "Helse", "🩹", "PERSONLIG PLEIE OG HELSE", false,
            p("Plaster", "Helse", "🩹"),
            p("Gnagsårplaster", "Helse", "🩹"),
            p("Hånddesinfeksjon", "Helse", "🧴"),
            p("Bomull", "Helse", "☁️"),
            p("Papirlommetørklær", "Helse", "🤧"),
            p("Saltvann nesespray", "Helse", "💧"),
            p("Termometer", "Helse", "🌡️"),
            p("Munnbind", "Helse", "😷"),
            p("Førstehjelpsbandasje", "Helse", "🩹"),
            p("Kompresser", "Helse", "🩹")
        ),
        new Category("clothing", "Klær", "👕", "HJEM OG LIVSSTIL", false,
            p("Sokker", "Klær", "🧦"),
            p("T-skjorte", "Klær", "👕"),
            p("Undertøy", "Klær", "👚"),
            p("Strømpebukse", "Klær", "🧦"),
            p("Hansker", "Klær", "🧤"),
            p("Lue", "Klær", "🧢"),
            p("Regnponcho", "Klær", "🧥"),
            p("Skolisser", "Klær", "👟")
        ),
        new Category("homegarden", "Hjem & hage", "💐", "HJEM OG LIVSSTIL", false,
            p("Lyspærer", "Hjem & hage", "💡"),
            p("Batterier AA", "Hjem & hage", "🔋"),
            p("Batterier AAA", "Hjem & hage", "🔋"),
            p("Blomster", "Hjem & hage", "💐"),
            p("Potteplante", "Hjem & hage", "🪴"),
            p("Stearinlys", "Hjem & hage", "🕯️"),
            p("Telys", "Hjem & hage", "🕯️"),
            p("Fyrstikker", "Hjem & hage", "🔥"),
            p("Aluminiumsfolie", "Hjem & hage", "📦"),
            p("Plastfolie", "Hjem & hage", "📦"),
            p("Bakepapir", "Hjem & hage", "📜"),
            p("Oppbevaringsposer", "Hjem & hage", "🛍️"),
            p("Engangstallerkener", "Hjem & hage", "🍽️"),
            p("Engangsbestikk", "Hjem & hage", "🍴")
        ),
        new Category("cleaning", "Rengjøring & vask", "🧴", "HJEM OG LIVSSTIL", false,
            p("Oppvaskmiddel", "Rengjøring & vask", "🧴"),
            p("Oppvasktabletter", "Rengjøring & vask", "🧼"),
            p("Vaskemiddel", "Rengjøring & vask", "🧺"),
            p("Tøymykner", "Rengjøring & vask", "🧺"),
            p("Flekkfjerner", "Rengjøring & vask", "🧴"),
            p("Universalrens", "Rengjøring & vask", "🧽"),
            p("Baderomsrens", "Rengjøring & vask", "🧽"),
            p("Glassrens", "Rengjøring & vask", "🪟"),
            p("Toalettrens", "Rengjøring & vask", "🚽"),
            p("Skuresvamp", "Rengjøring & vask", "🧽"),
            p("Mikrofiberkluter", "Rengjøring & vask", "🧽"),
            p("Søppelposer", "Rengjøring & vask", "🗑️"),
            p("Kjøkkenpapir", "Rengjøring & vask", "🧻"),
            p("Tørkepapir", "Rengjøring & vask", "🧻"),
            p("Gummihansker", "Rengjøring & vask", "🧤")
        ),
        new Category("stationery", "Kontor", "📚", "HJEM OG LIVSSTIL", false,
            p("Kulepenner", "Kontor", "🖊️"),
            p("Blyanter", "Kontor", "✏️"),
            p("Notatblokk", "Kontor", "📒"),
            p("Post-it lapper", "Kontor", "🗒️"),
            p("Konvolutter", "Kontor", "✉️"),
            p("Tape", "Kontor", "📎"),
            p("Saks", "Kontor", "✂️"),
            p("Limstift", "Kontor", "🧴"),
            p("Printerpapir", "Kontor", "📄"),
            p("Merkepenner", "Kontor", "🖍️"),
            p("Batterier", "Kontor", "🔋")
        ),
        new Category("pets", "Kjæledyr", "🐾", "ANNET", false,
            p("Kattemat tørrfôr", "Kjæledyr", "🐈"),
            p("Kattemat våtfôr", "Kjæledyr", "🐈"),
            p("Hundemat tørrfôr", "Kjæledyr", "🐕"),
            p("Hundemat våtfôr", "Kjæledyr", "🐕"),
            p("Kattesand", "Kjæledyr", "🐈"),
            p("Hundegodteri", "Kjæledyr", "🐾"),
            p("Kattegodteri", "Kjæledyr", "🐾"),
            p("Tyggebein", "Kjæledyr", "🦴"),
            p("Hundeposer", "Kjæledyr", "🗑️"),
            p("Fuglefrø", "Kjæledyr", "🐦"),
            p("Smådyrfôr", "Kjæledyr", "🐹")
        )
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
        String q = normalize(query);
        if (q.isEmpty()) return Collections.emptyList();
        List<Product> out = new ArrayList<>();
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (Category c : CATEGORIES) {
            for (Product p : c.products) {
                String haystack = normalize(p.name + " " + p.category);
                String key = normalize(p.name);
                if (haystack.contains(q) && seen.add(key)) out.add(p);
            }
        }
        return out;
    }

    public static int productCount() {
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (Category c : CATEGORIES) for (Product p : c.products) seen.add(normalize(p.name));
        return seen.size();
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(java.util.Locale.ROOT)
                .trim();
    }
}
