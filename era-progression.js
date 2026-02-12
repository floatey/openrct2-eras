/// <reference path="openrct2.d.ts" />

/**
 * OpenRCT2 Era-Based Progression System
 * 
 * Version: 0.5.1
 * Author: Floatey
 * License: MIT
 *
 * == Architecture: Two-Layer Object Management ==
 *
 * OpenRCT2 has TWO separate systems for managing what the player can build:
 *
 * Layer 1 - OBJECT SELECTION (objectManager.load / unload / getAllObjects)
 *   Controls which ride/scenery objects occupy a "slot" in the scenario.
 *   An object must be loaded before it can appear anywhere in the game.
 *   objectManager.load(identifier) -> { index } or null
 *   objectManager.unload(identifier) -> removes from scenario entirely
 *
 * Layer 2 - RESEARCH TABLE (park.research.inventedItems / uninventedItems)
 *   Controls which *loaded* objects are "invented" (buildable) vs "uninvented"
 *   (locked behind research). Each entry is { type, object: <slot index> }.
 *   A loaded object in NEITHER list is in limbo – slot occupied but inaccessible.
 *
 * This plugin manages both layers:
 *   - On init: backs up original state, loads era 0 objects, unloads non-era
 *     objects, rebuilds research table.
 *   - On progression: loads new era objects, rebuilds research table.
 *   - On regression (debug): unloads era objects, rebuilds research table.
 *   - Daily: rebuilds research table to prevent OpenRCT2 drift.
 */

// ========== ERA DEFINITIONS ==========

// Essential items that are immediately available (pre-invented) when an era unlocks
// Format: { rides: [ids], stalls: [ids] }
var ERA_ESSENTIALS = [
    {
        // Era 0: Antique Amusement - Extra essentials for starting
        rides: ["rct2.ride.mgr1", "rct2.ride.sfric1", "rct2.ride.lift1"],
        stalls: ["rct2.ride.tlt1", "rct1.ride.toilets", "rct2.ride.hotds", "rct2.ride.drnks"],
        scenery: ["rct2.scenery_group.scggardn", "rct2.scenery_group.scgtrees", "rct2.scenery_group.scgfence", "rct2.scenery_group.scgpathx"]
    },
    {
        // Era 1: Classic Coasters
        rides: ["rct2.ride.ptct2", "rct2.ride.dodg1", "rct2.ride.clift1"],
        stalls: ["rct2.ride.burgb", "rct2.ride.coffs"]
    },
    {
        // Era 2: Transition Era
        rides: ["rct2.ride.smc1", "rct2.ride.twist1", "rct2.ride.mono1"],
        stalls: ["rct2.ride.icecr1", "rct2.ride.dough"]
    },
    {
        // Era 3: Steel Renaissance
        rides: ["rct2.ride.arrt1", "rct2.ride.enterp", "rct2.ride.scht1"],
        stalls: ["rct2.ride.pizzs", "rct2.ride.icecr2"]
    },
    {
        // Era 4: Extreme Innovation
        rides: ["rct2.ride.rapboat", "rct2.ride.swsh1", "rct2.ride.arrsw1"],
        stalls: ["rct2.ride.substl", "rct2.ride.sqdst"]
    },
    {
        // Era 5: Modern Thrill Revolution
        rides: ["rct2.ride.arrt2", "rct2.ride.topsp1", "rct2.ride.slct"],
        stalls: ["rct2.ride.frnood", "rct2.ride.wonton"]
    },
    {
        // Era 6: Millennium Age
        rides: ["rct2.ride.bmsd", "rct2.ride.intst", "rct2.ride.intinv"],
        stalls: ["rct2tt.ride.softoyst", "rct2tt.ride.moonjuce"]
    }
];

var ERAS = [
    {
        name: "Antique Amusement (1890s-1910s)",
        description: "The birth of the amusement park",
        requirements: {
            ridesRequired: 8,
            guestsRequired: 500,
            parkRatingRequired: 700,
            yearsRequired: 2,
            cashRequired: 5000
        },
        color: "{WHITE}",
        items: [
            // Rides
            "rct2.ride.hmaze", "rct2.ride.mgr1", "rct2tt.ride.mgr2", "rct1.ride.horses",
            "rct2.ride.hskelt", "rct2.ride.cboat", "rct2ww.ride.outriggr", "rct2ww.ride.dhowwatr",
            "rct2.ride.rboat", "rct2.ride.swans", "rct2ww.ride.mandarin",
            "rct2.ride.trike", "rct2.ride.lift1", "rct2ww.ride.minelift",
            "rct1.ride.steam_trains", "rct1ll.ride.steam_trains_american", "rct1aa.ride.steam_trains_covered",
            "rct2.ride.aml1", "rct2ww.ride.steamtrn", "rct2.ride.nrl", "rct2.ride.nrl2",
            "rct2.ride.fwh1", "rct1aa.ride.virginia_reel_tubs", "rct2.ride.vreel",
            "rct1aa.ride.side_friction_cars", "rct2.ride.sfric1", "rct2.ride.chbuild",
            "rct2.ride.circus1", "rct1aa.ride.ghost_train_cars", "rct2.ride.gtc",
            "rct2.ride.hmcar", "rct2.ride.sbox", "rct2.ride.steep1", "rct2.ride.steep2",
            "rct2tt.ride.jousting", "rct1aa.ride.reverser_cars", "rct2.ride.revcar", "rct2tt.ride.policecr",

            // Scenery
            "rct2.scenery_group.scggardn", "rct2.scenery_group.scgshrub", "rct2.scenery_group.scgtrees",
            "rct2.scenery_group.scgfence", "rct2.scenery_group.scgwalls", "rct2.scenery_group.scgpathx",
            "rct2.scenery_group.scgwater", "rct2.scenery_group.scgegypt", "rct2.scenery_group.scgclass",
            "rct2tt.scenery_group.scgmediv", "rct2tt.scenery_group.scgmytho", "rct2.scenery_group.scgmedie",
            "rct2.scenery_group.scgpirat", "rct2.scenery_group.scgwond", "rct2.scenery_group.scgorien",

            // Stalls
            "rct2.ride.tlt1", "rct2.ride.hotds", "rct2.ride.drnks", "rct1.ride.toilets",
            "rct2.ride.tlt2", "rct2.ride.infok", "rct2.ride.souvs", "rct2.ride.balln"
        ]
    },
    {
        name: "Classic Coasters (1920s-1930s)",
        description: "The golden age begins",
        requirements: {
            ridesRequired: 5,
            guestsRequired: 800,
            parkRatingRequired: 750,
            yearsRequired: 2,
            cashRequired: 10000
        },
        color: "{WHITE}",
        items: [
            // Rides
            "rct2.ride.tram1", "rct2ww.ride.sanftram", "rct1aa.ride.bicycles", "rct2.ride.monbk",
            "rct2.ride.golf1", "rct2.ride.hhbuild", "rct1.ride.dodgems", "rct2.ride.dodg1",
            "rct2tt.ride.cyclopsx", "rct2tt.ride.figtknit", "rct2tt.ride.tricatop", "rct2ww.ride.dragdodg",
            "rct1.ride.bobsleigh_trains", "rct2.ride.bob1", "rct2.ride.intbob",
            "rct2tt.ride.blckdeth", "rct2ww.ride.penguinb", "rct1.ride.chairlift_cars",
            "rct2.ride.clift1", "rct1aa.ride.ski_lift_cars", "rct2.ride.clift2",
            "rct1.ride.mouse_cars", "rct2.ride.wmmine", "rct2.ride.wmouse",
            "rct2.ride.ptct2", "rct2.ride.ptct2r",

            // Scenery
            "rct2tt.scenery_group.scg1920s", "rct2tt.scenery_group.scg1920w", "rct2.scenery_group.scgmine",
            "rct2.scenery_group.scgindus", "rct2.scenery_group.scgwwest",

            // Stalls
            "rct2.ride.burgb", "rct2.ride.popcs", "rct2.ride.lemst", "rct2.ride.coffs",
            "rct2tt.ride.1920sand", "rct2.ride.hatst", "rct2.ride.cndyf", "rct1.ride.fruity_ices_stall"
        ]
    },
    {
        name: "Transition Era (1950s)",
        description: "Innovation and expansion",
        requirements: {
            ridesRequired: 5,
            guestsRequired: 1200,
            parkRatingRequired: 800,
            yearsRequired: 2,
            cashRequired: 20000
        },
        color: "{WHITE}",
        items: [
            // Rides
            "rct1aa.ride.steel_wild_mouse_cars", "rct2.ride.smc1", "rct2.ride.smc2",
            "rct1aa.ride.vintage_cars", "rct2.ride.ctcar", "rct1.ride.racing_cars", "rct2.ride.rcr",
            "rct2.ride.vcr", "rct1.ride.sports_cars", "rct2.ride.spcar", "rct2ww.ride.huskie",
            "rct2ww.ride.londonbs", "rct2ww.ride.blackcab", "rct2tt.ride.schoolbs",
            "rct2tt.ride.pegasusx", "rct2ww.ride.crnvbfly", "rct2ww.ride.crnvfrog", "rct2ww.ride.crnvlzrd",
            "rct1.ride.bumper_boats", "rct2.ride.bboat", "rct1aa.ride.mini_helicopters",
            "rct2.ride.helicar", "rct2.ride.srings", "rct2.ride.twist1", "rct2.ride.twist2",
            "rct2tt.ride.dinoeggs", "rct2tt.ride.flalmace", "rct2tt.ride.gintspdr",
            "rct2tt.ride.neptunex", "rct2tt.ride.tommygun", "rct2tt.ride.trebucht",
            "rct2ww.ride.coffeecu", "rct2ww.ride.diamondr", "rct2ww.ride.faberge",
            "rct2ww.ride.fightkit", "rct2ww.ride.firecrak", "rct2ww.ride.italypor", "rct2ww.ride.tutlboat",
            "rct1.ride.logs", "rct2.ride.lfb1", "rct2.ride.pmt1",
            "rct2ww.ride.crocflum", "rct2ww.ride.dolphinr",
            "rct1aa.ride.flying_saucers", "rct2.ride.fsauc", "rct2tt.ride.flwrpowr", "rct2ww.ride.skidoo",
            "rct1.ride.go_karts", "rct2.ride.kart1", "rct2tt.ride.cavmncar", "rct2tt.ride.1920racr",
            "rct2tt.ride.spokprsn", "rct2.ride.submar", "rct2ww.ride.hipporid", "rct2ww.ride.killwhal",
            "rct1.ride.small_monorail_cars", "rct1.ride.streamlined_monorail_trains",
            "rct1aa.ride.suspended_monorail_trains", "rct2.ride.mono1", "rct2.ride.mono2",
            "rct2.ride.smono", "rct2.ride.mono3", "rct2tt.ride.zeplelin",

            // Scenery
            "rct2tt.scenery_group.scg1960s", "rct2.scenery_group.scgspace",

            // Stalls
            "rct2.ride.dough", "rct2.ride.cookst", "rct2.ride.icecr1", "rct2.ride.toffs"
        ]
    },
    {
        name: "Steel Renaissance (1960s-1970s)",
        description: "Steel coasters and intense thrills",
        requirements: {
            ridesRequired: 6,
            guestsRequired: 1500,
            parkRatingRequired: 800,
            yearsRequired: 3,
            cashRequired: 35000
        },
        color: "{WHITE}",
        items: [
            // Rides
            "rct2.ride.ding1", "rct1.ride.corkscrew_trains", "rct2.ride.arrt1", "rct1.ride.dinghies",
            "rct2ww.ride.caddilac", "rct2ww.ride.seals", "rct1.ride.wooden_rc_trains",
            "rct2.ride.ptct1", "rct2ww.ride.stgccstr", "rct2ww.ride.minecart",
            "rct1.ride.mine_trains", "rct1.ride.mine_cars", "rct2.ride.amt1",
            "rct2.ride.enterp", "rct2.ride.scht1", "rct1.ride.steel_rc_trains",
            "rct1.ride.steel_rc_trains_reversed", "rct2tt.ride.polchase",
            "rct2tt.ride.telepter", "rct2.ride.obs1", "rct2.ride.obs2", "rct2tt.ride.bmvoctps",
            "rct2.ride.wcatc", "rct2.ride.jstar1", "rct1.ride.rocket_cars",
            "rct2.ride.rckc", "rct2.ride.spdrcr", "rct2ww.ride.rssncrrd",
            "rct1.ride.pickup_trucks", "rct2.ride.4x4", "rct2.ride.truck1",
            "rct1.ride.motorbikes", "rct1ll.ride.jet_skis", "rct2.ride.jski",

            // Scenery
            "rct2.scenery_group.scgspook", "rct2.scenery_group.scghallo",
            "rct2.scenery_group.scgjungl", "rct2tt.scenery_group.scgjurra", "rct2.scenery_group.scgjuras",

            // Stalls
            "rct2.ride.pizzs", "rct2.ride.chpsh", "rct2.ride.chpsh2", "rct2.ride.funcake",
            "rct2.ride.pretst", "rct2.ride.icecr2", "rct2.ride.hchoc"
        ]
    },
    {
        name: "Extreme Innovation (1980s)",
        description: "Water rides and suspended thrills",
        requirements: {
            ridesRequired: 6,
            guestsRequired: 2000,
            parkRatingRequired: 800,
            yearsRequired: 3,
            cashRequired: 50000
        },
        color: "{WHITE}",
        items: [
            // Water Rides
            "rct1ll.ride.coaster_boats", "rct2.ride.cstboat", "rct2.ride.mcarpet1",
            "rct1.ride.river_rapids_boats", "rct1ll.ride.rafts", "rct2.ride.rapboat",
            "rct1.ride.reverse_freefall_car", "rct2.ride.rftboat",
            "rct1aa.ride.splash_boats", "rct2.ride.spboat", "rct2.ride.wmspin",
            "rct2tt.ride.flygboat", "rct2tt.ride.oakbarel", "rct2tt.ride.rivrstyx",
            "rct2tt.ride.trilobte", "rct2ww.ride.congaeel", "rct2ww.ride.mantaray",
            "rct2ww.ride.seals", "rct2ww.ride.gratwhte",

            // Swinging Ships & Towers
            "rct2.ride.swsh1", "rct2.ride.swsh2", "rct2ww.ride.junkswng",
            "rct2.ride.gdrop1",

            // Suspended Swinging Coasters
            "rct1.ride.suspended_swinging_cars", "rct1.ride.suspended_swinging_aeroplane_cars",
            "rct2.ride.arrsw1", "rct2.ride.arrsw2", "rct2ww.ride.rocket", "rct2.ride.vekvamp",
            "rct2tt.ride.seaplane", "rct2ww.ride.football", "rct2ww.ride.gorilla",
            "rct2ww.ride.sloth", "rct2ww.ride.sputnikr",

            // Simulators
            "rct2.ride.simpod", "rct2tt.ride.microbus", "rct2tt.ride.timemach",
            "rct2ww.ride.polarber",

            // Stand-up Coasters
            "rct1.ride.stand_up_trains", "rct1aa.ride.stand_up_twister_trains",
            "rct2.ride.bmsu", "rct2.ride.togst", "rct2tt.ride.stamphrd",
            "rct2ww.ride.ostrich", "rct2ww.ride.surfbrdc",

            // Heartline & Compact Coasters
            "rct1aa.ride.heartline_twister_cars", "rct2.ride.bmvd", "rct2.ride.utcar",
            "rct2.ride.utcarr", "rct2ww.ride.tigrtwst",

            // Wooden Coasters
            "rct2.ride.mft", "rct1.ride.wooden_rc_trains_reversed",
            "rct1aa.ride.wooden_articulated_trains",

            // Scenery
            "rct2.scenery_group.scgabstr", "rct2.scenery_group.scgsnow",

            // Stalls
            "rct2.ride.rsaus", "rct2.ride.chknug", "rct2.ride.chcks", "rct2.ride.substl",
            "rct2.ride.sqdst", "rct2.ride.bnoodles"
        ]
    },
    {
        name: "Modern Thrill Revolution (1990s)",
        description: "Inversions and innovation peaks",
        requirements: {
            ridesRequired: 6,
            guestsRequired: 2500,
            parkRatingRequired: 800,
            yearsRequired: 3,
            cashRequired: 75000
        },
        color: "{WHITE}",
        items: [
            // Hypercoasters
            "rct1ll.ride.hypercoaster_trains", "rct2.ride.arrt2",

            // Dark Rides & Attractions
            "rct2tt.ride.funhouse", "rct2tt.ride.halofmrs", "rct2.ride.c3d",

            // Flat Rides
            "rct2.ride.topsp1", "rct2.ride.ssc1",

            // Suspended Looping Coasters
            "rct2.ride.slcfo", "rct2.ride.slct",

            // Compact Inverted Coasters
            "rct1.ride.cat_cars", "rct1.ride.ladybird_trains",
            "rct1ll.ride.inverted_hairpin_cars", "rct1ll.ride.face_off_cars",
            "rct2.ride.ivmc1", "rct2.ride.vekst",

            // Flying & Lay-down Coasters
            "rct1.ride.swinging_lay_down_cars", "rct1aa.ride.lay_down_trains",
            "rct2.ride.zldb", "rct2tt.ride.harpiesx",

            // Wooden Variations
            "rct2.ride.zlog", "rct1.ride.log_trains", "rct2tt.ride.battrram",
            "rct2ww.ride.bullet", "rct2ww.ride.condorrd", "rct2ww.ride.dragon",
            "rct2ww.ride.jaguarrd", "rct2ww.ride.lionride", "rct2ww.ride.rhinorid",
            "rct2ww.ride.whicgrub",

            // Futuristic Vehicles
            "rct2tt.ride.jetplane", "rct2tt.ride.jetpackx", "rct2tt.ride.hovrbord",
            "rct2tt.ride.hoverbke", "rct2tt.ride.hovercar",

            // Inverted Coasters
            "rct2.ride.nemt",

            // Launch Coasters
            "rct2.ride.revf1", "rct2ww.ride.kolaride",
            "rct1ll.ride.air_powered_trains", "rct2.ride.thcar",
            "rct2tt.ride.hotrodxx", "rct2ww.ride.bomerang",

            // Sky Coasters
            "rct1.ride.single_person_swinging_cars", "rct2.ride.skytr",
            "rct2.ride.batfl", "rct2tt.ride.dragnfly",

            // LIM Launch
            "rct2.ride.premt1", "rct2ww.ride.tgvtrain", "rct2tt.ride.ganstrcr",

            // Scenery
            "rct2.scenery_group.scgmart", "rct2.scenery_group.scgcandy",
            "rct2.scenery_group.scggiant", "rct2.scenery_group.scgsport",
            "rct2.scenery_group.scgurban", "rct2ww.scenery_group.scgeurop",
            "rct2ww.scenery_group.scgnamrc", "rct2ww.scenery_group.scgasia",
            "rct2ww.scenery_group.scgafric", "rct2ww.scenery_group.scgsamer",
            "rct2ww.scenery_group.scgaustr", "rct2ww.scenery_group.scgartic",

            // Stalls
            "rct2.ride.frnood", "rct2.ride.mbsoup", "rct2.ride.wonton",
            "rct2.ride.icetst", "rct2.ride.soybean", "rct2.ride.cindr",
            "rct2.ride.sungst", "rct2.ride.tshrt", "rct2.ride.faid1", "rct2.ride.atm1"
        ]
    },
    {
        name: "Millennium Age (2000s+)",
        description: "The ultimate experiences",
        requirements: {
            ridesRequired: 0,
            guestsRequired: 0,
            parkRatingRequired: 0,
            yearsRequired: 0,
            cashRequired: 0
        },
        color: "{WHITE}",
        items: [
            // Modern Twister Coasters
            "rct1aa.ride.twister_trains", "rct2.ride.bmsd",
            "rct1aa.ride.hyper_twister_trains", "rct2.ride.bmrb", "rct2.ride.goltr",
            "rct2tt.ride.cerberus", "rct2ww.ride.anaconda",

            // Floorless Coasters
            "rct1aa.ride.floorless_twister_trains", "rct2.ride.bmfl",

            // Giga & Mega Coasters
            "rct2.ride.intst", "rct2tt.ride.valkyrie",
            "rct1.ride.vertical_drop_trains", "rct2.ride.vekdv",
            "rct2ww.ride.taxicstr", "rct2.ride.arrx",

            // Flying & Inverted Coasters
            "rct1.ride.inverted_trains", "rct1ll.ride.4_across_inverted_trains",
            "rct2.ride.bmair", "rct2.ride.intinv", "rct2tt.ride.barnstrm",

            // Prehistoric Themed
            "rct2tt.ride.raptorxx", "rct2tt.ride.pterodac",

            // Modern Innovations
            "openrct2.ride.hybrid_coaster", "openrct2.ride.single_rail_coaster",
            "openrct2.ride.alpine_coaster", "openrct2.ride.modern_twister",

            // Scenery
            "rct2tt.scenery_group.scgfutur", "rct2.scenery_group.scgsixfl",
            "rct2dlc.scenery_group.scgpanda",

            // Stalls
            "rct2tt.ride.softoyst", "rct2tt.ride.1960tsrt", "rct2tt.ride.medisoup",
            "rct2tt.ride.mythosea", "rct2tt.ride.mktstal1", "rct2tt.ride.mktstal2",
            "rct2tt.ride.moonjuce", "rct2.ride.starfrdr",

            // Special
            "rct2dlc.ride.zpanda"
        ]
    }
];

// ========== STORAGE & STATE ==========

var STORAGE_KEY = "eraProgressionData_v8";
var debugWindow = null;

function getStorage() {
    var storage = context.getParkStorage();
    if (!storage.has(STORAGE_KEY)) {
        var initialData = {
            currentEra: 0,
            builtRides: {},
            unlockedEras: [],
            initialized: false,
            disabled: false,
            backupResearch: null,
            eraStartDate: null,
            readyToProgress: false
        };
        storage.set(STORAGE_KEY, JSON.stringify(initialData));
    }
    return JSON.parse(storage.get(STORAGE_KEY));
}

function saveStorage(data) {
    var storage = context.getParkStorage();
    storage.set(STORAGE_KEY, JSON.stringify(data));
}

// ========== HELPER FUNCTIONS ==========

/**
 * Get current park guests count
 */
function getCurrentGuests() {
    return park.guests;
}

/**
 * Get current park rating
 */
function getCurrentParkRating() {
    return park.rating;
}

/**
 * Get current park cash (in dollars, converted from game currency)
 */
function getCurrentCash() {
    return park.cash / 10.0;  // Game uses 10x multiplier
}

/**
 * Get years passed since era started
 */
function getYearsInCurrentEra(data) {
    if (!data.eraStartDate) {
        return 0;
    }

    var currentDate = date;
    var startDate = data.eraStartDate;

    // Calculate year difference
    var yearsPassed = currentDate.year - startDate.year;

    // Adjust for partial years based on month
    if (currentDate.month < startDate.month) {
        yearsPassed--;
    }

    return Math.max(0, yearsPassed);
}

/**
 * Format cash for display
 */
function formatCash(amount) {
    return "$" + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Check if an object identifier is from an allowed source.
 * Only objects from rct2. and openrct2. are allowed.
 */
function isAllowedObject(identifier) {
    return identifier.indexOf('rct2.') === 0 || identifier.indexOf('openrct2.') === 0;
}

// ========== LAYER 1: OBJECT SELECTION MANAGEMENT ==========
// These functions manage which objects are loaded into scenario slots.
// Objects must be loaded (Layer 1) before they can appear in research (Layer 2).

/**
 * Determine the objectManager type from an identifier string.
 * "rct2.scenery_group.xyz" -> "scenery_group", everything else -> "ride"
 */
function getObjectManagerType(identifier) {
    return identifier.indexOf('.scenery_group.') !== -1 ? 'scenery_group' : 'ride';
}

/**
 * Look up the slot index for a currently-loaded object by identifier.
 * Returns -1 if not loaded. The slot index is what the research table references.
 */
function findLoadedSlotIndex(identifier) {
    var objType = getObjectManagerType(identifier);
    var loaded = objectManager.getAllObjects(objType);
    for (var i = 0; i < loaded.length; i++) {
        if (loaded[i].identifier === identifier) {
            return loaded[i].index;
        }
    }
    return -1;
}

/**
 * Check if an object is currently loaded in the scenario's object selection.
 */
function isObjectInScenario(identifier) {
    return findLoadedSlotIndex(identifier) !== -1;
}

/**
 * Load a single object into the scenario's object selection (Layer 1).
 * Does NOT add to research table – call rebuildResearchTable() afterward.
 */
function loadObjectIntoScenario(identifier) {
    try {
        var result = objectManager.load(identifier);
        if (result !== null) {
            console.log("Loaded into scenario: " + identifier + " (slot " + result.index + ")");
            return result;
        }
        console.log("Failed to load (null return): " + identifier);
        return null;
    } catch (e) {
        console.log("Error loading " + identifier + ": " + e);
        return null;
    }
}

/**
 * Unload a single object from the scenario's object selection (Layer 1).
 * Also removes dangling research table entries to prevent stale slot references.
 */
function unloadObjectFromScenario(identifier) {
    var slotIndex = findLoadedSlotIndex(identifier);
    if (slotIndex === -1) return false;

    // Clean up research table BEFORE unloading to avoid dangling slot references
    removeSlotFromResearchTable(slotIndex);

    try {
        objectManager.unload(identifier);
        console.log("Unloaded from scenario: " + identifier);
        return true;
    } catch (e) {
        console.log("Failed to unload " + identifier + ": " + e);
        return false;
    }
}

/**
 * Load all objects for a specific era into the scenario (Layer 1 only).
 * Already-loaded objects are skipped. Call rebuildResearchTable() afterward.
 */
function loadEraIntoScenario(eraIndex) {
    if (eraIndex < 0 || eraIndex >= ERAS.length) return { loaded: 0, skipped: 0, failed: 0 };

    var era = ERAS[eraIndex];
    var loaded = 0, skipped = 0, failed = 0;

    for (var i = 0; i < era.items.length; i++) {
        if (!isAllowedObject(era.items[i])) { skipped++; continue; }
        if (isObjectInScenario(era.items[i])) { skipped++; continue; }
        if (loadObjectIntoScenario(era.items[i])) { loaded++; } else { failed++; }
    }

    console.log("Era " + eraIndex + " (" + era.name + "): loaded=" + loaded + " skipped=" + skipped + " failed=" + failed);
    return { loaded: loaded, skipped: skipped, failed: failed };
}

/**
 * Unload objects from a specific era that are no longer needed (Layer 1).
 * Protects objects needed by other unlocked eras or from the original scenario.
 */
function unloadEraFromScenario(eraIndex, data) {
    if (eraIndex < 0 || eraIndex >= ERAS.length) return 0;

    var era = ERAS[eraIndex];

    // Objects still needed by other unlocked eras
    var stillNeeded = {};
    for (var i = 0; i < data.unlockedEras.length; i++) {
        if (data.unlockedEras[i] === eraIndex) continue;
        var otherEra = ERAS[data.unlockedEras[i]];
        for (var j = 0; j < otherEra.items.length; j++) {
            if (isAllowedObject(otherEra.items[j])) {
                stillNeeded[otherEra.items[j]] = true;
            }
        }
    }

    // Objects from the original scenario backup (never unload these)
    var originalObjects = {};
    if (data.backupResearch && data.backupResearch.loadedObjects) {
        for (var i = 0; i < data.backupResearch.loadedObjects.length; i++) {
            originalObjects[data.backupResearch.loadedObjects[i]] = true;
        }
    }

    var unloaded = 0;
    for (var i = 0; i < era.items.length; i++) {
        var id = era.items[i];
        if (!isAllowedObject(id)) continue;
        if (stillNeeded[id] || originalObjects[id]) continue;
        if (unloadObjectFromScenario(id)) unloaded++;
    }
    return unloaded;
}

/**
 * Unload all scenario objects NOT in any unlocked era.
 * Called during initialization to clear the scenario's default object selection.
 */
function unloadNonEraObjects(data) {
    var keepIds = {};
    for (var i = 0; i < data.unlockedEras.length; i++) {
        var era = ERAS[data.unlockedEras[i]];
        for (var j = 0; j < era.items.length; j++) {
            if (isAllowedObject(era.items[j])) {
                keepIds[era.items[j]] = true;
            }
        }
    }

    var types = ["ride", "scenery_group"];
    var unloaded = 0;
    for (var t = 0; t < types.length; t++) {
        var all = objectManager.getAllObjects(types[t]);
        for (var i = 0; i < all.length; i++) {
            if (!keepIds[all[i].identifier]) {
                removeSlotFromResearchTable(all[i].index);
                try { objectManager.unload(all[i].identifier); unloaded++; } catch (e) { /* in use */ }
            }
        }
    }
    console.log("Cleaned " + unloaded + " non-era objects from scenario");
    return unloaded;
}

// ========== LAYER 2: RESEARCH TABLE MANAGEMENT ==========
// These functions manage which loaded objects are "invented" vs "uninvented".
// An object must already be loaded (Layer 1) to have a research table entry.

/**
 * Remove all research entries referencing a specific slot index.
 * Must be called BEFORE unloading an object to avoid dangling references.
 */
function removeSlotFromResearchTable(slotIndex) {
    park.research.inventedItems = park.research.inventedItems.filter(function (item) {
        return item.object !== slotIndex;
    });
    park.research.uninventedItems = park.research.uninventedItems.filter(function (item) {
        return item.object !== slotIndex;
    });
    // Double-set to force OpenRCT2 to recognize the change
    var tmp = park.research.inventedItems;
    park.research.inventedItems = tmp;
}

/**
 * Resolve a research table entry back to its identifier string.
 * Research entries store slot indices, not identifiers.
 */
function resolveResearchItemIdentifier(researchItem) {
    try {
        var objType = researchItem.type === 'ride' ? 'ride' : 'scenery_group';
        var obj = objectManager.getObject(objType, researchItem.object);
        return obj ? obj.identifier : null;
    } catch (e) {
        return null;
    }
}

/**
 * Rebuild the ENTIRE research table from scratch.
 *
 * This is the authoritative sync between Layer 1 and Layer 2.
 * It scans every loaded object in the scenario and places each into either
 * inventedItems (if its identifier is in an unlocked era) or uninventedItems.
 *
 * New behavior:
 * - Essential items from current era -> invented
 * - All items from previous eras -> invented (reward for progression)
 * - Non-essential items from current era -> uninvented (to be researched)
 * - Items from future eras -> uninvented
 */
function rebuildResearchTable(data) {
    if (data.disabled) return;

    // Build lookup for essential items in current era
    var essentialIds = {};
    if (data.currentEra >= 0 && data.currentEra < ERA_ESSENTIALS.length) {
        var essentials = ERA_ESSENTIALS[data.currentEra];
        if (essentials.rides) {
            for (var i = 0; i < essentials.rides.length; i++) {
                if (isAllowedObject(essentials.rides[i])) {
                    essentialIds[essentials.rides[i]] = true;
                }
            }
        }
        if (essentials.stalls) {
            for (var i = 0; i < essentials.stalls.length; i++) {
                if (isAllowedObject(essentials.stalls[i])) {
                    essentialIds[essentials.stalls[i]] = true;
                }
            }
        }
        if (essentials.scenery) {
            for (var i = 0; i < essentials.scenery.length; i++) {
                if (isAllowedObject(essentials.scenery[i])) {
                    essentialIds[essentials.scenery[i]] = true;
                }
            }
        }
    }

    // Build lookup for ALL items from previous eras (should all be invented)
    var previousEraIds = {};
    for (var i = 0; i < data.currentEra; i++) {
        if (i >= 0 && i < ERAS.length) {
            var era = ERAS[i];
            for (var j = 0; j < era.items.length; j++) {
                if (isAllowedObject(era.items[j])) {
                    previousEraIds[era.items[j]] = true;
                }
            }
        }
    }

    // Build lookup for current era items
    var currentEraIds = {};
    if (data.currentEra >= 0 && data.currentEra < ERAS.length) {
        var currentEra = ERAS[data.currentEra];
        for (var i = 0; i < currentEra.items.length; i++) {
            if (isAllowedObject(currentEra.items[i])) {
                currentEraIds[currentEra.items[i]] = true;
            }
        }
    }

    // Gather all existing research entries into one pool
    var allEntries = park.research.inventedItems.concat(park.research.uninventedItems);

    // Track which slot indices we've already seen (to find orphans)
    var seenSlots = {};
    for (var i = 0; i < allEntries.length; i++) {
        seenSlots[allEntries[i].type + ":" + allEntries[i].object] = true;
    }

    // Scan loaded rides for orphans (loaded but missing from research table)
    var loadedRides = objectManager.getAllObjects("ride");
    for (var i = 0; i < loadedRides.length; i++) {
        var key = "ride:" + loadedRides[i].index;
        if (!seenSlots[key]) {
            allEntries.push({ type: "ride", object: loadedRides[i].index });
            console.log("Recovered orphaned ride: " + loadedRides[i].identifier + " (slot " + loadedRides[i].index + ")");
        }
    }

    // Scan loaded scenery groups for orphans
    var loadedScenery = objectManager.getAllObjects("scenery_group");
    for (var i = 0; i < loadedScenery.length; i++) {
        var key = "scenery:" + loadedScenery[i].index;
        if (!seenSlots[key]) {
            allEntries.push({ type: "scenery", object: loadedScenery[i].index });
            console.log("Recovered orphaned scenery: " + loadedScenery[i].identifier + " (slot " + loadedScenery[i].index + ")");
        }
    }

    // Sort entries based on new logic
    var newInvented = [];
    var newUninvented = [];

    for (var i = 0; i < allEntries.length; i++) {
        var entry = allEntries[i];
        var identifier = resolveResearchItemIdentifier(entry);

        if (identifier) {
            // Essential items from current era -> invented
            if (essentialIds[identifier]) {
                newInvented.push(entry);
            }
            // All items from previous eras -> invented (reward)
            else if (previousEraIds[identifier]) {
                newInvented.push(entry);
            }
            // Non-essential items from current era -> uninvented (to research)
            else if (currentEraIds[identifier]) {
                newUninvented.push(entry);
            }
            // Items from future/unknown eras -> uninvented
            else {
                newUninvented.push(entry);
            }
        } else {
            // Unknown items default to uninvented
            newUninvented.push(entry);
        }
    }

    // Apply – double-set inventedItems to force OpenRCT2 to recognize the change
    park.research.inventedItems = newInvented;
    park.research.uninventedItems = newUninvented;
    park.research.inventedItems = newInvented;

    console.log("Research table rebuilt: " + newInvented.length + " invented, " + newUninvented.length + " uninvented");
}

// ========== CORE FUNCTIONS ==========

/**
 * Initialize the era system on a fresh scenario.
 *
 * Flow:
 * 1. Back up the scenario's current state (both layers)
 * 2. Load era 0 objects into scenario (Layer 1)
 * 3. Unload non-era objects from scenario (Layer 1)
 * 4. Rebuild research table so only era 0 items are invented (Layer 2)
 * 5. Disable research funding
 */
function initializeEraSystem() {
    var data = getStorage();

    if (data.initialized) {
        return;
    }

    data.unlockedEras = [0];
    data.disabled = false;
    data.eraStartDate = {
        year: date.year,
        month: date.month,
        day: date.day
    };

    // -- Step 1: Back up current scenario state --
    // Store identifiers (not slot indices) because indices shift when objects load/unload.
    data.backupResearch = {
        inventedItems: [],
        uninventedItems: [],
        funding: park.research.funding,
        loadedObjects: []   // All identifiers loaded in scenario before we modify it
    };

    // Back up invented research items by identifier
    for (var i = 0; i < park.research.inventedItems.length; i++) {
        var item = park.research.inventedItems[i];
        var objectType = item.type === 'ride' ? 'ride' : 'scenery_group';
        var obj = objectManager.getObject(objectType, item.object);

        if (obj) {
            data.backupResearch.inventedItems.push({
                type: item.type,
                identifier: obj.identifier,
                category: item.category || undefined,
                flags: item.flags || undefined
            });
        }
    }

    // Back up uninvented research items by identifier
    for (var i = 0; i < park.research.uninventedItems.length; i++) {
        var item = park.research.uninventedItems[i];
        var objectType = item.type === 'ride' ? 'ride' : 'scenery_group';
        var obj = objectManager.getObject(objectType, item.object);

        if (obj) {
            data.backupResearch.uninventedItems.push({
                type: item.type,
                identifier: obj.identifier,
                category: item.category || undefined,
                flags: item.flags || undefined
            });
        }
    }

    // Back up ALL loaded object identifiers (rides + scenery groups)
    var loadedRides = objectManager.getAllObjects("ride");
    for (var i = 0; i < loadedRides.length; i++) {
        data.backupResearch.loadedObjects.push(loadedRides[i].identifier);
    }
    var loadedScenery = objectManager.getAllObjects("scenery_group");
    for (var i = 0; i < loadedScenery.length; i++) {
        data.backupResearch.loadedObjects.push(loadedScenery[i].identifier);
    }

    console.log("Backed up scenario state:");
    console.log("  Invented: " + data.backupResearch.inventedItems.length);
    console.log("  Uninvented: " + data.backupResearch.uninventedItems.length);
    console.log("  Loaded objects: " + data.backupResearch.loadedObjects.length);

    // -- Step 2: Load era 0 objects into scenario (Layer 1) --
    var result = loadEraIntoScenario(0);

    // -- Step 3: Unload non-era objects (Layer 1) --
    unloadNonEraObjects(data);

    // -- Step 4: Rebuild research table (Layer 2) --
    rebuildResearchTable(data);

    // -- Step 5: Set default research funding --
    park.research.funding = 2;  // Default: Maximum funding

    data.initialized = true;
    saveStorage(data);

    console.log("Era Progression System initialized!");

    park.postMessage({
        type: 'award',
        text: "Era System initialized!\n" + ERAS[0].name + " (" + result.loaded + " objects loaded)"
    });
}

// Old markUnlockedErasAsResearched, markEraAsResearched, resetResearchSystem,
// and getItemIdentifier are replaced by rebuildResearchTable() above.

function getRideIdentifier(ride) {
    try {
        if (ride.object && ride.object.identifier) {
            return ride.object.identifier;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function countEraRidesBuilt(eraIndex) {
    if (eraIndex < 0 || eraIndex >= ERAS.length) return 0;

    var era = ERAS[eraIndex];
    var uniqueRides = {};

    var eraRides = {};
    for (var i = 0; i < era.items.length; i++) {
        var id = era.items[i];
        if (!isAllowedObject(id)) continue;
        if (id.indexOf('.ride.') !== -1 &&
            id.indexOf('.scenery_group.') === -1) {
            eraRides[id] = true;
        }
    }

    for (var i = 0; i < map.rides.length; i++) {
        var ride = map.rides[i];

        if (ride.classification !== 'ride') continue;

        var identifier = getRideIdentifier(ride);

        if (identifier && eraRides[identifier]) {
            if (!uniqueRides[identifier]) {
                uniqueRides[identifier] = true;
            }
        }
    }

    return Object.keys(uniqueRides).length;
}

/**
 * Check all requirements for current era and return status
 */
function checkAllRequirements(eraIndex, data) {
    if (eraIndex < 0 || eraIndex >= ERAS.length) {
        return null;
    }

    var era = ERAS[eraIndex];
    var req = era.requirements;

    var ridesBuilt = countEraRidesBuilt(eraIndex);
    var currentGuests = getCurrentGuests();
    var currentRating = getCurrentParkRating();
    var currentCash = getCurrentCash();
    var yearsInEra = getYearsInCurrentEra(data);

    return {
        ridesBuilt: ridesBuilt,
        ridesMet: ridesBuilt >= req.ridesRequired,
        guestsMet: currentGuests >= req.guestsRequired,
        ratingMet: currentRating >= req.parkRatingRequired,
        cashMet: currentCash >= req.cashRequired,
        yearsMet: yearsInEra >= req.yearsRequired,
        allMet: ridesBuilt >= req.ridesRequired &&
            currentGuests >= req.guestsRequired &&
            currentRating >= req.parkRatingRequired &&
            currentCash >= req.cashRequired &&
            yearsInEra >= req.yearsRequired,
        currentGuests: currentGuests,
        currentRating: currentRating,
        currentCash: currentCash,
        yearsInEra: yearsInEra
    };
}

function getEraStats(eraIndex) {
    if (eraIndex < 0 || eraIndex >= ERAS.length) return null;

    var era = ERAS[eraIndex];
    var data = getStorage();
    var isUnlocked = data.unlockedEras && data.unlockedEras.indexOf(eraIndex) !== -1;
    var isCurrent = data.currentEra === eraIndex;

    var requirements = checkAllRequirements(eraIndex, data);
    var isCompleted = requirements ? requirements.allMet : false;

    var rideCount = 0;
    var sceneryCount = 0;
    var stallCount = 0;

    for (var i = 0; i < era.items.length; i++) {
        var id = era.items[i];
        if (!isAllowedObject(id)) continue;
        if (id.indexOf('.scenery_group.') !== -1) {
            sceneryCount++;
        } else if (id.indexOf('.ride.') !== -1) {
            // Comprehensive stall detection - check for all stall identifiers
            if (id.indexOf('tlt1') !== -1 || id.indexOf('tlt2') !== -1 ||
                id.indexOf('hotds') !== -1 || id.indexOf('drnks') !== -1 ||
                id.indexOf('toilets') !== -1 || id.indexOf('infok') !== -1 ||
                id.indexOf('souvs') !== -1 || id.indexOf('balln') !== -1 ||
                id.indexOf('burgb') !== -1 || id.indexOf('popcs') !== -1 ||
                id.indexOf('lemst') !== -1 || id.indexOf('coffs') !== -1 ||
                id.indexOf('1920sand') !== -1 || id.indexOf('hatst') !== -1 ||
                id.indexOf('cndyf') !== -1 || id.indexOf('fruity_ices_stall') !== -1 ||
                id.indexOf('dough') !== -1 || id.indexOf('cookst') !== -1 ||
                id.indexOf('icecr1') !== -1 || id.indexOf('icecr2') !== -1 ||
                id.indexOf('toffs') !== -1 || id.indexOf('pizzs') !== -1 ||
                id.indexOf('chpsh') !== -1 || id.indexOf('chpsh2') !== -1 ||
                id.indexOf('funcake') !== -1 || id.indexOf('pretst') !== -1 ||
                id.indexOf('hchoc') !== -1 || id.indexOf('rsaus') !== -1 ||
                id.indexOf('chknug') !== -1 || id.indexOf('chcks') !== -1 ||
                id.indexOf('substl') !== -1 || id.indexOf('sqdst') !== -1 ||
                id.indexOf('bnoodles') !== -1 || id.indexOf('frnood') !== -1 ||
                id.indexOf('mbsoup') !== -1 || id.indexOf('wonton') !== -1 ||
                id.indexOf('icetst') !== -1 || id.indexOf('soybean') !== -1 ||
                id.indexOf('cindr') !== -1 || id.indexOf('sungst') !== -1 ||
                id.indexOf('tshrt') !== -1 || id.indexOf('faid1') !== -1 ||
                id.indexOf('atm1') !== -1 || id.indexOf('softoyst') !== -1 ||
                id.indexOf('1960tsrt') !== -1 || id.indexOf('medisoup') !== -1 ||
                id.indexOf('mythosea') !== -1 || id.indexOf('mktstal1') !== -1 ||
                id.indexOf('mktstal2') !== -1 || id.indexOf('moonjuce') !== -1 ||
                id.indexOf('starfrdr') !== -1) {
                stallCount++;
            } else {
                rideCount++;
            }
        }
    }

    return {
        era: era,
        requirements: requirements,
        isUnlocked: isUnlocked,
        isCurrent: isCurrent,
        isCompleted: isCompleted,
        totalRides: rideCount,
        totalScenery: sceneryCount,
        totalStalls: stallCount,
        totalItems: era.items.length
    };
}

function checkEraProgression() {
    var data = getStorage();

    if (!data.initialized || data.disabled) return;
    if (data.currentEra >= ERAS.length - 1) return;

    var requirements = checkAllRequirements(data.currentEra, data);

    if (!requirements || !requirements.allMet) {
        // Requirements not met - clear the flag
        if (data.readyToProgress) {
            data.readyToProgress = false;
            saveStorage(data);
        }
        return;
    }

    // Requirements met! Set flag but don't auto-progress
    if (!data.readyToProgress) {
        data.readyToProgress = true;
        saveStorage(data);

        // Pause the game and show prominent notification
        ui.paused = true;
        park.postMessage({
            type: 'award',
            text: "New Era Available!\n" + ERAS[data.currentEra + 1].name + "\nOpen Era System to progress."
        });

        console.log("Era progression ready: " + ERAS[data.currentEra + 1].name);
    }
}

/**
 * Actually progress to the next era (called by button press)
 * @param skipCashDeduction - If true, don't deduct cash (for debug mode)
 */
function progressToNextEra(skipCashDeduction) {
    var data = getStorage();

    if (!data.initialized || data.disabled) return false;
    if (data.currentEra >= ERAS.length - 1) return false;

    var requirements = checkAllRequirements(data.currentEra, data);
    if (!requirements || !requirements.allMet) return false;

    // Deduct cash (unless we're in debug mode)
    if (!skipCashDeduction) {
        var currentEra = ERAS[data.currentEra];
        if (currentEra.requirements.cashRequired > 0) {
            park.cash -= currentEra.requirements.cashRequired * 10;  // Game uses 10x multiplier
        }
    }

    // -- Advance era --
    data.currentEra++;
    if (!data.unlockedEras) { data.unlockedEras = [0]; }
    if (data.unlockedEras.indexOf(data.currentEra) === -1) {
        data.unlockedEras.push(data.currentEra);
    }
    data.eraStartDate = { year: date.year, month: date.month, day: date.day };
    data.readyToProgress = false;
    saveStorage(data);

    // -- Load new era objects (Layer 1) then rebuild research table (Layer 2) --
    var result = loadEraIntoScenario(data.currentEra);
    rebuildResearchTable(data);

    var nextEra = ERAS[data.currentEra];
    park.postMessage({
        type: 'award',
        text: "Era Unlocked!\n" + nextEra.name + "\n" + result.loaded + " new objects!"
    });

    console.log("Advanced to era: " + nextEra.name);

    if (debugWindow) {
        refreshDebugWindow();
    }

    return true;
}

// ========== GUI ==========

function openControlWindow() {
    var existingWindow = ui.getWindow("era-progression-control");
    if (existingWindow) {
        existingWindow.close();
    }

    var data = getStorage();
    var widgets = [];
    var y = 20;

    if (!data.initialized || data.disabled) {
        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 50,
            text: "Build rides and develop your park to unlock new eras!\n\nClick Initialize to start."
        });
        y += 60;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 30,
            text: "{YELLOW}Note: Research funding is managed normally\nto maintain era progression."
        });
        y += 35;

        widgets.push({
            type: "button",
            x: 90,
            y: y,
            width: 200,
            height: 30,
            text: "Initialize Era System",
            onClick: function () {
                initializeEraSystem();
                ui.getWindow("era-progression-control").close();
                openControlWindow();
            }
        });
        y += 40;
    } else {
        var currentEra = ERAS[data.currentEra];
        var progressRequirements = checkAllRequirements(data.currentEra, data);
        var isLastEra = data.currentEra >= ERAS.length - 1;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 14,
            text: "{WHITE}Current Era:"
        });
        y += 16;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 14,
            text: currentEra.color + currentEra.name
        });
        y += 14;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 14,
            text: "{SILVER}" + currentEra.description
        });
        y += 22;

        // Requirements section - show current era's requirements for progression
        if (!isLastEra && progressRequirements) {
            var req = currentEra.requirements;

            widgets.push({
                type: "label",
                x: 10,
                y: y,
                width: 380,
                height: 14,
                text: "{WHITE}Requirements to unlock next era:"
            });
            y += 18;

            // Get current park stats
            var currentGuests = getCurrentGuests();
            var currentRating = getCurrentParkRating();
            var currentCash = getCurrentCash();
            var yearsInEra = getYearsInCurrentEra(data);
            var ridesBuilt = progressRequirements.ridesBuilt;

            // Rides requirement
            if (req.ridesRequired > 0) {
                var ridesColor = progressRequirements.ridesMet ? "{GREEN}" : "{YELLOW}";
                var checkmark = progressRequirements.ridesMet ? "✓" : "-";
                widgets.push({
                    type: "label",
                    x: 15,
                    y: y,
                    width: 365,
                    height: 14,
                    text: ridesColor + checkmark + " " + ridesBuilt + " / " + req.ridesRequired + " unique rides"
                });
                y += 14;
            }

            // Guests requirement
            if (req.guestsRequired > 0) {
                var guestsColor = progressRequirements.guestsMet ? "{GREEN}" : "{YELLOW}";
                var checkmark = progressRequirements.guestsMet ? "✓" : "-";
                widgets.push({
                    type: "label",
                    x: 15,
                    y: y,
                    width: 365,
                    height: 14,
                    text: guestsColor + checkmark + " " + currentGuests + " / " + req.guestsRequired + " guests in park"
                });
                y += 14;
            }

            // Rating requirement
            if (req.parkRatingRequired > 0) {
                var ratingColor = progressRequirements.ratingMet ? "{GREEN}" : "{YELLOW}";
                var checkmark = progressRequirements.ratingMet ? "✓" : "-";
                widgets.push({
                    type: "label",
                    x: 15,
                    y: y,
                    width: 365,
                    height: 14,
                    text: ratingColor + checkmark + " " + currentRating + " / " + req.parkRatingRequired + " park rating"
                });
                y += 14;
            }

            // Years requirement
            if (req.yearsRequired > 0) {
                var yearsColor = progressRequirements.yearsMet ? "{GREEN}" : "{YELLOW}";
                var checkmark = progressRequirements.yearsMet ? "✓" : "-";
                var yearText = req.yearsRequired === 1 ? "year" : "years";
                widgets.push({
                    type: "label",
                    x: 15,
                    y: y,
                    width: 365,
                    height: 14,
                    text: yearsColor + checkmark + " " + yearsInEra + " / " + req.yearsRequired + " " + yearText + " in era"
                });
                y += 14;
            }

            // Cash requirement
            if (req.cashRequired > 0) {
                var cashColor = progressRequirements.cashMet ? "{GREEN}" : "{YELLOW}";
                var checkmark = progressRequirements.cashMet ? "✓" : "-";
                widgets.push({
                    type: "label",
                    x: 15,
                    y: y,
                    width: 365,
                    height: 14,
                    text: cashColor + checkmark + " " + formatCash(currentCash) + " / " + formatCash(req.cashRequired) + " cash"
                });
                y += 14;
            }

            y += 6;

            // Overall progress indicator and button
            if (progressRequirements.allMet) {
                widgets.push({
                    type: "label",
                    x: 10,
                    y: y,
                    width: 380,
                    height: 14,
                    text: "{GREEN}All requirements met! Click below to progress."
                });
                y += 18;

                // Big prominent button to progress
                widgets.push({
                    type: "button",
                    x: 60,
                    y: y,
                    width: 260,
                    height: 40,
                    text: "Progress to " + ERAS[data.currentEra + 1].name,
                    onClick: function () {
                        var success = progressToNextEra();
                        if (success) {
                            ui.getWindow("era-progression-control").close();
                            openControlWindow();
                        }
                    }
                });
                y += 48;
            } else {
                var metCount = 0;
                var totalCount = 0;
                if (req.ridesRequired > 0) { totalCount++; if (progressRequirements.ridesMet) metCount++; }
                if (req.guestsRequired > 0) { totalCount++; if (progressRequirements.guestsMet) metCount++; }
                if (req.parkRatingRequired > 0) { totalCount++; if (progressRequirements.ratingMet) metCount++; }
                if (req.yearsRequired > 0) { totalCount++; if (progressRequirements.yearsMet) metCount++; }
                if (req.cashRequired > 0) { totalCount++; if (progressRequirements.cashMet) metCount++; }

                widgets.push({
                    type: "label",
                    x: 10,
                    y: y,
                    width: 380,
                    height: 14,
                    text: "{YELLOW}Progress: " + metCount + " / " + totalCount + " requirements met"
                });
                y += 18;
            }
        } else {
            widgets.push({
                type: "label",
                x: 10,
                y: y,
                width: 380,
                height: 14,
                text: "{GREEN}All eras unlocked! You've reached the modern age."
            });
            y += 18;
        }

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 14,
            text: "{SILVER}Unlocked eras: " + data.unlockedEras.length + " / " + ERAS.length
        });
        y += 16;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 380,
            height: 14,
            text: "{YELLOW}Research funding: Controlled by player"
        });
        y += 22;

        widgets.push({
            type: "button",
            x: 10,
            y: y,
            width: 180,
            height: 30,
            text: "Refresh Progress",
            onClick: function () {
                openControlWindow();
            }
        });

        widgets.push({
            type: "button",
            x: 200,
            y: y,
            width: 180,
            height: 30,
            text: "Open Debug Window",
            onClick: function () {
                openDebugWindow();
            }
        });
        y += 35;
    }

    if (!data.initialized || data.disabled) {
        widgets.push({
            type: "button",
            x: 90,
            y: y,
            width: 200,
            height: 30,
            text: "Open Debug Window",
            onClick: function () {
                openDebugWindow();
            }
        });
    }

    ui.openWindow({
        classification: "era-progression-control",
        title: "Era Progression System v0.5.0",
        width: 400,
        height: y + 40,
        widgets: widgets
    });
}

function openDebugWindow() {
    if (debugWindow) {
        debugWindow.close();
    }

    var data = getStorage();

    debugWindow = ui.openWindow({
        classification: "era-debug",
        title: "Era Progress Debug v0.5.0",
        width: 520,
        height: 620,
        widgets: createDebugWidgets(data),
        onClose: function () {
            debugWindow = null;
        }
    });
}

function createDebugWidgets(data) {
    var widgets = [];
    var y = 15;

    var statusText = "{RED}NOT INITIALIZED";
    if (data.disabled) {
        statusText = "{ORANGE}DISABLED";
    } else if (data.initialized) {
        statusText = "{GREEN}ACTIVE";
    }

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{WHITE}System Status: " + statusText
    });
    y += 20;

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{WHITE}Unlocked Eras: {YELLOW}" + (data.unlockedEras ? data.unlockedEras.length : 0) + " / " + ERAS.length
    });
    y += 25;

    // Current park stats
    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{WHITE}------- CURRENT PARK STATUS -------"
    });
    y += 16;

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{YELLOW}Guests: " + getCurrentGuests() + " | Rating: " + getCurrentParkRating() + " | Cash: " + formatCash(getCurrentCash())
    });
    y += 14;

    if (data.eraStartDate) {
        var yearsInEra = getYearsInCurrentEra(data);
        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 500,
            height: 14,
            text: "{YELLOW}Years in current era: " + yearsInEra
        });
        y += 14;
    }

    y += 10;

    var currentEra = ERAS[data.currentEra];
    var currentStats = getEraStats(data.currentEra);

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{WHITE}----------- CURRENT ERA -----------"
    });
    y += 16;

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: currentEra.color + currentEra.name
    });
    y += 14;

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{SILVER}" + currentEra.description
    });
    y += 18;

    // Show requirements for CURRENT era (what you need to progress)
    if (currentStats.requirements && data.currentEra < ERAS.length - 1) {
        var req = currentEra.requirements;
        var status = currentStats.requirements;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 500,
            height: 14,
            text: "{WHITE}Requirements to Progress (Current Era):"
        });
        y += 16;

        // Rides
        if (req.ridesRequired > 0) {
            var ridesColor = status.ridesMet ? "{GREEN}" : "{RED}";
            widgets.push({
                type: "label",
                x: 20,
                y: y,
                width: 480,
                height: 14,
                text: ridesColor + status.ridesBuilt + " / " + req.ridesRequired + " rides built"
            });
            y += 14;
        }

        // Guests
        if (req.guestsRequired > 0) {
            var guestsColor = status.guestsMet ? "{GREEN}" : "{RED}";
            widgets.push({
                type: "label",
                x: 20,
                y: y,
                width: 480,
                height: 14,
                text: guestsColor + status.currentGuests + " / " + req.guestsRequired + " guests"
            });
            y += 14;
        }

        // Rating
        if (req.parkRatingRequired > 0) {
            var ratingColor = status.ratingMet ? "{GREEN}" : "{RED}";
            widgets.push({
                type: "label",
                x: 20,
                y: y,
                width: 480,
                height: 14,
                text: ratingColor + status.currentRating + " / " + req.parkRatingRequired + " park rating"
            });
            y += 14;
        }

        // Years
        if (req.yearsRequired > 0) {
            var yearsColor = status.yearsMet ? "{GREEN}" : "{RED}";
            widgets.push({
                type: "label",
                x: 20,
                y: y,
                width: 480,
                height: 14,
                text: yearsColor + status.yearsInEra + " / " + req.yearsRequired + " years"
            });
            y += 14;
        }

        // Cash
        if (req.cashRequired > 0) {
            var cashColor = status.cashMet ? "{GREEN}" : "{RED}";
            widgets.push({
                type: "label",
                x: 20,
                y: y,
                width: 480,
                height: 14,
                text: cashColor + formatCash(status.currentCash) + " / " + formatCash(req.cashRequired) + " cash"
            });
            y += 14;
        }

        y += 4;

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 500,
            height: 14,
            text: status.allMet ? "{GREEN}ALL REQUIREMENTS MET!" : "{YELLOW}Keep working on requirements..."
        });
        y += 18;
    } else if (data.currentEra >= ERAS.length - 1) {
        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 500,
            height: 14,
            text: "{GREEN}Final era reached - no more requirements!"
        });
        y += 18;
    }

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{WHITE}Content: {YELLOW}" + currentStats.totalRides + " rides {SILVER}| " +
            "{YELLOW}" + currentStats.totalStalls + " stalls {SILVER}| " +
            "{YELLOW}" + currentStats.totalScenery + " scenery groups"
    });
    y += 25;

    widgets.push({
        type: "label",
        x: 10,
        y: y,
        width: 500,
        height: 14,
        text: "{WHITE}------------ ALL ERAS ------------"
    });
    y += 18;

    for (var i = 0; i < ERAS.length; i++) {
        var stats = getEraStats(i);
        var status = "";
        var color = "{WHITE}";

        if (!stats.isUnlocked) {
            status = "LOCKED";
            color = "{RED}";
        } else if (stats.isCurrent) {
            status = "CURRENT";
            color = "{YELLOW}";
        } else if (stats.isCompleted) {
            status = "COMPLETED";
            color = "{GREEN}";
        } else {
            status = "UNLOCKED";
            color = "{LIGHT_BLUE}";
        }

        widgets.push({
            type: "label",
            x: 10,
            y: y,
            width: 500,
            height: 14,
            text: color + "Era " + (i + 1) + ": " + stats.era.name + " [" + status + "]"
        });
        y += 14;

        if (stats.isUnlocked || stats.isCurrent) {
            var req = stats.era.requirements;
            var reqText = "";
            var reqParts = [];

            if (req.ridesRequired > 0) reqParts.push(req.ridesRequired + " rides");
            if (req.guestsRequired > 0) reqParts.push(req.guestsRequired + " guests");
            if (req.parkRatingRequired > 0) reqParts.push(req.parkRatingRequired + " rating");
            if (req.yearsRequired > 0) reqParts.push(req.yearsRequired + "y");
            if (req.cashRequired > 0) reqParts.push(formatCash(req.cashRequired));

            if (reqParts.length > 0) {
                reqText = reqParts.join(", ");
                widgets.push({
                    type: "label",
                    x: 30,
                    y: y,
                    width: 470,
                    height: 14,
                    text: "{SILVER}Requires: " + reqText
                });
                y += 14;
            }
        }

        y += 2;
    }

    y += 10;

    // Control buttons
    widgets.push({
        type: "button",
        x: 10,
        y: y,
        width: 120,
        height: 28,
        text: "REFRESH",
        onClick: function () {
            refreshDebugWindow();
        }
    });

    widgets.push({
        type: "button",
        x: 140,
        y: y,
        width: 120,
        height: 28,
        text: "Check Progress",
        onClick: function () {
            checkEraProgression();
            refreshDebugWindow();
        }
    });

    widgets.push({
        type: "button",
        x: 270,
        y: y,
        width: 120,
        height: 28,
        text: "Rebuild Research",
        onClick: function () {
            var data = getStorage();
            rebuildResearchTable(data);
            ui.showError("Research Rebuilt", "Research table synced to unlocked eras");
        }
    });

    widgets.push({
        type: "button",
        x: 400,
        y: y,
        width: 110,
        height: 28,
        text: "Add Year",
        onClick: function () {
            var data = getStorage();
            if (data.eraStartDate) {
                data.eraStartDate.year--;
                saveStorage(data);
                refreshDebugWindow();
                ui.showError("Debug", "Added 1 year to era time");
            }
        }
    });

    y += 32;

    widgets.push({
        type: "button",
        x: 10,
        y: y,
        width: 120,
        height: 28,
        text: "< Previous Era",
        onClick: function () {
            var data = getStorage();
            if (data.disabled) {
                ui.showError("System Disabled", "Cannot change eras while system is disabled");
                return;
            }

            if (data.currentEra > 0) {
                var removedEra = data.currentEra;
                data.currentEra--;

                if (!data.unlockedEras) {
                    data.unlockedEras = [0];
                }
                var newUnlockedEras = [];
                for (var i = 0; i < data.unlockedEras.length; i++) {
                    if (data.unlockedEras[i] <= data.currentEra) {
                        newUnlockedEras.push(data.unlockedEras[i]);
                    }
                }
                data.unlockedEras = newUnlockedEras;

                // Reset era start date
                data.eraStartDate = {
                    year: date.year,
                    month: date.month,
                    day: date.day
                };

                saveStorage(data);

                // Unload objects from eras no longer unlocked (Layer 1)
                for (var i = removedEra; i < ERAS.length; i++) {
                    if (data.unlockedEras.indexOf(i) === -1) {
                        unloadEraFromScenario(i, data);
                    }
                }
                // Rebuild research table (Layer 2)
                rebuildResearchTable(data);
                refreshDebugWindow();
                ui.showError("Era Changed", "Moved to " + ERAS[data.currentEra].name);

                var controlWindow = ui.getWindow("era-progression-control");
                if (controlWindow) {
                    controlWindow.close();
                    openControlWindow();
                }
            } else {
                ui.showError("Cannot Go Back", "Already at first era");
            }
        }
    });

    widgets.push({
        type: "button",
        x: 140,
        y: y,
        width: 120,
        height: 28,
        text: "Next Era >",
        onClick: function () {
            var data = getStorage();
            if (data.disabled) {
                ui.showError("System Disabled", "Cannot change eras while system is disabled");
                return;
            }

            if (data.currentEra < ERAS.length - 1) {
                // Debug mode: Don't deduct cash
                data.currentEra++;

                if (!data.unlockedEras) {
                    data.unlockedEras = [0];
                }
                if (data.unlockedEras.indexOf(data.currentEra) === -1) {
                    data.unlockedEras.push(data.currentEra);
                }

                // Reset era start date
                data.eraStartDate = {
                    year: date.year,
                    month: date.month,
                    day: date.day
                };

                // Clear ready flag
                data.readyToProgress = false;

                saveStorage(data);

                // Load new era objects (Layer 1) then rebuild research (Layer 2)
                loadEraIntoScenario(data.currentEra);
                rebuildResearchTable(data);
                refreshDebugWindow();
                ui.showError("Era Changed", "Moved to " + ERAS[data.currentEra].name);

                var controlWindow = ui.getWindow("era-progression-control");
                if (controlWindow) {
                    controlWindow.close();
                    openControlWindow();
                }
            } else {
                ui.showError("Cannot Advance", "Already at final era");
            }
        }
    });

    widgets.push({
        type: "button",
        x: 270,
        y: y,
        width: 240,
        height: 28,
        text: "Reset System",
        onClick: function () {
            var data = getStorage();

            // Safeguard: Don't allow resetting if system is already disabled
            if (data.disabled) {
                ui.showError("Already Disabled", "System is already disabled. Nothing to reset.");
                return;
            }

            if (data.backupResearch) {
                console.log("Restoring backed up research state...");

                // Step 1: Reload all original objects that were unloaded during init
                var reloadedCount = 0;
                if (data.backupResearch.loadedObjects) {
                    for (var i = 0; i < data.backupResearch.loadedObjects.length; i++) {
                        var objId = data.backupResearch.loadedObjects[i];
                        if (!isObjectInScenario(objId)) {
                            try {
                                var result = objectManager.load(objId);
                                if (result !== null) {
                                    reloadedCount++;
                                    console.log("Reloaded original object: " + objId);
                                }
                            } catch (e) {
                                console.log("Failed to reload original object " + objId + ": " + e);
                            }
                        }
                    }
                }
                console.log("Reloaded " + reloadedCount + " original objects");

                var restoredInvented = [];
                var restoredUninvented = [];

                var skippedInvented = 0;
                var skippedUninvented = 0;

                for (var i = 0; i < data.backupResearch.inventedItems.length; i++) {
                    var item = data.backupResearch.inventedItems[i];
                    var objectType = item.type === 'ride' ? 'ride' : 'scenery_group';

                    try {
                        var loadedObjects = objectManager.getAllObjects(objectType);
                        var foundObj = null;

                        for (var j = 0; j < loadedObjects.length; j++) {
                            if (loadedObjects[j].identifier === item.identifier) {
                                foundObj = loadedObjects[j];
                                break;
                            }
                        }

                        if (foundObj) {
                            var restoredItem = {
                                type: item.type,
                                object: foundObj.index
                            };
                            if (item.category !== undefined) {
                                restoredItem.category = item.category;
                            }
                            if (item.flags !== undefined) {
                                restoredItem.flags = item.flags;
                            }
                            restoredInvented.push(restoredItem);
                        } else {
                            skippedInvented++;
                            console.log("Skipped invented item (not loaded): " + item.identifier);
                        }
                    } catch (e) {
                        console.log("Error restoring invented item " + item.identifier + ": " + e);
                        skippedInvented++;
                    }
                }

                for (var i = 0; i < data.backupResearch.uninventedItems.length; i++) {
                    var item = data.backupResearch.uninventedItems[i];
                    var objectType = item.type === 'ride' ? 'ride' : 'scenery_group';

                    try {
                        var loadedObjects = objectManager.getAllObjects(objectType);
                        var foundObj = null;

                        for (var j = 0; j < loadedObjects.length; j++) {
                            if (loadedObjects[j].identifier === item.identifier) {
                                foundObj = loadedObjects[j];
                                break;
                            }
                        }

                        if (foundObj) {
                            var restoredItem = {
                                type: item.type,
                                object: foundObj.index
                            };
                            if (item.category !== undefined) {
                                restoredItem.category = item.category;
                            }
                            if (item.flags !== undefined) {
                                restoredItem.flags = item.flags;
                            }
                            restoredUninvented.push(restoredItem);
                        } else {
                            skippedUninvented++;
                            console.log("Skipped uninvented item (not loaded): " + item.identifier);
                        }
                    } catch (e) {
                        console.log("Error restoring uninvented item " + item.identifier + ": " + e);
                        skippedUninvented++;
                    }
                }

                park.research.inventedItems = restoredInvented;
                park.research.uninventedItems = restoredUninvented;
                park.research.inventedItems = restoredInvented;

                park.research.funding = data.backupResearch.funding;
                park.research.progress = 0;

                var originalObjects = {};
                for (var i = 0; i < data.backupResearch.loadedObjects.length; i++) {
                    originalObjects[data.backupResearch.loadedObjects[i]] = true;
                }

                var unloadedCount = 0;
                var resetTypes = ["ride", "scenery_group"];
                for (var t = 0; t < resetTypes.length; t++) {
                    var allLoaded = objectManager.getAllObjects(resetTypes[t]);
                    for (var i = 0; i < allLoaded.length; i++) {
                        var objId = allLoaded[i].identifier;
                        if (!originalObjects[objId]) {
                            try {
                                objectManager.unload(objId);
                                unloadedCount++;
                            } catch (e) {
                                console.log("Failed to unload " + objId + ": " + e);
                            }
                        }
                    }
                }

                var storage = context.getParkStorage();
                storage.set(STORAGE_KEY, JSON.stringify({
                    currentEra: 0,
                    builtRides: {},
                    unlockedEras: [],
                    initialized: false,
                    disabled: true,
                    backupResearch: null,
                    eraStartDate: null,
                    readyToProgress: false
                }));

                console.log("Restored research state:");
                console.log("  - Invented items: " + restoredInvented.length + " (skipped: " + skippedInvented + ")");
                console.log("  - Uninvented items: " + restoredUninvented.length + " (skipped: " + skippedUninvented + ")");
                console.log("  - Funding level: " + park.research.funding);
                console.log("  - Unloaded objects: " + unloadedCount);

                ui.showError("Reset Complete!", "Original state restored (" + unloadedCount + " objects unloaded)");

                // Close debug window if open
                if (debugWindow) {
                    debugWindow.close();
                    debugWindow = null;
                }
            } else {
                var storage = context.getParkStorage();
                storage.set(STORAGE_KEY, JSON.stringify({
                    currentEra: 0,
                    builtRides: {},
                    unlockedEras: [],
                    initialized: false,
                    disabled: true,
                    backupResearch: null,
                    eraStartDate: null,
                    readyToProgress: false
                }));

                park.research.uninventedItems = park.research.inventedItems.concat(park.research.uninventedItems);
                park.research.inventedItems = [];
                park.research.funding = 2;
                park.research.progress = 0;

                ui.showError("Reset!", "No backup found - research cleared");
            }

            // Close debug window if open
            if (debugWindow) {
                debugWindow.close();
                debugWindow = null;
            }

            var controlWindow = ui.getWindow("era-progression-control");
            if (controlWindow) {
                controlWindow.close();
                openControlWindow();
            }
        }
    });

    return widgets;
}

function refreshDebugWindow() {
    if (!debugWindow) return;
    openDebugWindow();
}

// ========== MAIN ==========

// Research funding is now controlled by the player

function dailyCheck() {
    var data = getStorage();

    if (data.disabled || !data.initialized) return;

    checkEraProgression();
}

function main() {
    console.log("Era-Based Progression System v0.5.0 loaded!");

    if (typeof park === 'undefined') {
        return;
    }

    context.subscribe("interval.day", function () {
        dailyCheck();
    });

    if (typeof ui !== 'undefined') {
        ui.registerMenuItem("Era Progression System", function () {
            openControlWindow();
        });
    }
}

registerPlugin({
    name: "Era-Based Progression System",
    version: "0.5.1",
    authors: ["Floatey"],
    type: "remote",
    licence: "MIT",
    targetApiVersion: 77,
    main: main
});