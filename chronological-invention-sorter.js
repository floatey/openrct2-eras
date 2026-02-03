/// <reference path="openrct2.d.ts" />

/**
 * OpenRCT2 Chronological Invention Sorter
 * 
 * This plugin reorganizes the invention list to match real-world chronological order
 * of ride and attraction inventions. Based on historical research of when each ride
 * type mechanism was first invented.
 * 
 * Version: 1.1.0
 * Author: Claude
 * License: MIT
 */

// Chronological order of rides based on real-world invention dates
var CHRONOLOGICAL_ORDER = [
    // Ancient & Pre-Mechanical
    "rct2.ride.hmaze",
    
    // Human/Animal-Powered Watercraft (~1600s)
    "rct2.ride.cboat",
    "rct2ww.ride.dhowwatr",
    "rct2ww.ride.outriggr",
    "rct2.ride.rboat",
    "rct2.ride.swans",
    "rct2ww.ride.mandarin",
    "rct2.ride.trike",
    
    // Early Mechanical Amusements (~1780s)
    "rct2.ride.mgr1",
    "rct2tt.ride.mgr2",
    "rct2.ride.hskelt",
    
    // Elevators (~1852)
    "rct2.ride.lift1",
    "rct2tt.ride.telepter",
    "rct2ww.ride.minelift",
    
    // Observation Towers, Railways & Chairlifts (~1860s)
    "rct2.ride.obs1",
    "rct2.ride.obs2",
    "rct2tt.ride.bmvoctps",
    "rct2.ride.aml1",
    "rct2.ride.clift1",
    "rct2.ride.clift2",
    "rct2.ride.nrl",
    "rct2.ride.nrl2",
    "rct2ww.ride.steamtrn",
    
    // Swinging Ships (~1880s)
    "rct2.ride.swsh1",
    "rct2.ride.swsh2",
    "rct2ww.ride.junkswng",
    
    // Wooden Roller Coasters (~1884)
    "rct2.ride.ptct1",
    "rct2.ride.ptct2",
    "rct2.ride.ptct2r",
    "rct2ww.ride.minecart",
    "rct2ww.ride.stgccstr",
    
    // Side-Friction & Wild Mouse (~1890s)
    "rct2.ride.mft",
    "rct2.ride.sfric1",
    "rct2.ride.wmmine",
    "rct2.ride.wmouse",
    "rct2ww.ride.crnvbfly",
    "rct2ww.ride.crnvfrog",
    "rct2ww.ride.crnvlzrd",
    
    // Ferris Wheel & Virginia Reel (~1893)
    "rct2.ride.fwh1",
    "rct2.ride.vreel",
    
    // Steeplechase (~1898)
    "rct2.ride.sbox",
    "rct2.ride.steep1",
    "rct2.ride.steep2",
    "rct2tt.ride.jousting",
    "rct2tt.ride.raptorxx",
    
    // First Steel Looping & Dark Rides (~1900)
    "rct2.ride.chbuild",
    "rct2.ride.circus1",
    "rct2.ride.gtc",
    "rct2.ride.hmcar",
    "rct2.ride.scht1",
    "rct2tt.ride.funhouse",
    "rct2tt.ride.halofmrs",
    "rct2tt.ride.polchase",
    
    // Monorails (~1901)
    "rct2.ride.mono1",
    "rct2.ride.mono2",
    "rct2.ride.mono3",
    "rct2tt.ride.zeplelin",
    
    // Trams, Car Rides & Suspended Monorails (~1910s)
    "rct2.ride.4x4",
    "rct2.ride.ctcar",
    "rct2.ride.monbk",
    "rct2.ride.rcr",
    "rct2.ride.smono",
    "rct2.ride.spcar",
    "rct2.ride.tram1",
    "rct2.ride.truck1",
    "rct2.ride.vcr",
    "rct2tt.ride.hoverbke",
    "rct2tt.ride.pegasusx",
    "rct2tt.ride.schoolbs",
    "rct2ww.ride.blackcab",
    "rct2ww.ride.huskie",
    "rct2ww.ride.londonbs",
    "rct2ww.ride.sanftram",
    
    // Dodgems (~1919)
    "rct2.ride.dodg1",
    "rct2tt.ride.cyclopsx",
    "rct2tt.ride.figtknit",
    "rct2tt.ride.tricatop",
    "rct2ww.ride.dragdodg",
    
    // Haunted Houses & Mini Golf (~1920s)
    "rct2.ride.golf1",
    "rct2.ride.hhbuild",
    "rct2tt.ride.spokprsn",
    
    // Bobsled Coasters (~1929)
    "rct2.ride.bob1",
    "rct2.ride.intbob",
    "rct2tt.ride.blckdeth",
    "rct2ww.ride.penguinb",
    
    // 3D Cinema (~1950)
    "rct2.ride.c3d",
    
    // Go-Karts (~1956)
    "rct2.ride.kart1",
    "rct2tt.ride.1920racr",
    "rct2tt.ride.cavmncar",
    
    // Steel Mouse Coasters (~1958)
    "rct2.ride.smc1",
    "rct2.ride.smc2",
    
    // 1960s Flat Rides
    "rct2.ride.batfl",
    "rct2.ride.bboat",
    "rct2.ride.enterp",
    "rct2.ride.helicar",
    "rct2.ride.srings",
    "rct2.ride.topsp1",
    "rct2.ride.twist1",
    "rct2.ride.twist2",
    "rct2tt.ride.dinoeggs",
    "rct2tt.ride.dragnfly",
    "rct2tt.ride.flalmace",
    "rct2tt.ride.gintspdr",
    "rct2tt.ride.tommygun",
    "rct2tt.ride.trebuchet",
    "rct2ww.ride.coffeecu",
    "rct2ww.ride.diamondr",
    "rct2ww.ride.faberge",
    "rct2ww.ride.fightkit",
    "rct2ww.ride.firecrak",
    "rct2ww.ride.italypor",
    "rct2ww.ride.sputnikr",
    "rct2ww.ride.tutlboat",
    
    // Flying Saucers (~1961)
    "rct2.ride.fsauc",
    "rct2tt.ride.flwrpowr",
    "rct2ww.ride.skidoo",
    
    // Log Flumes, Jet Skis, Mine Trains, Freefall Towers (~1963)
    "rct2.ride.amt1",
    "rct2.ride.gdrop1",
    "rct2.ride.jski",
    "rct2.ride.lfb1",
    "rct2.ride.pmt1",
    "rct2ww.ride.crocflum",
    "rct2ww.ride.dolphinr",
    
    // Submarine Rides (~1964)
    "rct2.ride.submar",
    "rct2ww.ride.hipporid",
    "rct2ww.ride.killwhal",
    
    // Water Slides (~1971)
    "rct2.ride.ding1",
    
    // Corkscrew Coasters (~1975)
    "rct2.ride.arrt1",
    
    // Water Rides, Steel Twisters, Launches & Spinning Mouse (~1980s)
    "rct2.ride.bmsd",
    "rct2.ride.cstboat",
    "rct2.ride.mcarpet1",
    "rct2.ride.rapboat",
    "rct2.ride.revf1",
    "rct2.ride.rftboat",
    "rct2.ride.spboat",
    "rct2.ride.ssc1",
    "rct2.ride.wcatc",
    "rct2.ride.wmspin",
    "rct2tt.ride.flygboat",
    "rct2tt.ride.jetpackx",
    "rct2tt.ride.oakbarel",
    "rct2tt.ride.trilobte",
    "rct2ww.ride.congaeel",
    "rct2ww.ride.gratwhte",
    "rct2ww.ride.kolaride",
    "rct2ww.ride.mantaray",
    "rct2ww.ride.seals",
    
    // Suspended Swinging Coasters (~1981)
    "rct2.ride.arrsw1",
    "rct2.ride.arrsw2",
    "rct2.ride.vekvamp",
    "rct2tt.ride.seaplane",
    "rct2ww.ride.football",
    "rct2ww.ride.gorilla",
    "rct2ww.ride.rocket",
    "rct2ww.ride.sloth",
    
    // Wooden Reverser (~1982)
    "rct2.ride.revcar",
    "rct2tt.ride.policecr",
    
    // Compact Inverted Coasters & Motion Simulators (~1983)
    "rct2.ride.nemt",
    "rct2.ride.simpod",
    "rct2.ride.slcfo",
    "rct2.ride.slct",
    "rct2tt.ride.microbus",
    "rct2tt.ride.timemach",
    "rct2ww.ride.polarber",
    
    // Stand-Up Coasters (~1984)
    "rct2.ride.bmsu",
    "rct2.ride.togst",
    "rct2tt.ride.stamphrd",
    "rct2ww.ride.ostrich",
    "rct2ww.ride.surfbrdc",
    
    // Vertical / Heartline Coasters (~1985)
    "rct2.ride.bmvd",
    "rct2.ride.utcar",
    "rct2.ride.utcarr",
    "rct2tt.ride.valkyrie",
    
    // Hyper-Twister Coasters (~1988)
    "rct2.ride.bmrb",
    "rct2.ride.goltr",
    "rct2tt.ride.cerberus",
    "rct2ww.ride.anaconda",
    
    // Hypercoasters (~1989)
    "rct2.ride.arrt2",
    
    // Lay-Down, Junior, Spiral & Inverted Wild Mouse (~1990s)
    "rct2.ride.ivmc1",
    "rct2.ride.jstar1",
    "rct2.ride.rckc",
    "rct2.ride.skytr",
    "rct2.ride.spdrcr",
    "rct2.ride.vekst",
    "rct2.ride.zldb",
    "rct2.ride.zlog",
    "rct2tt.ride.battrram",
    "rct2tt.ride.hovrbord",
    "rct2tt.ride.jetplane",
    "rct2ww.ride.bullet",
    "rct2ww.ride.caddilac",
    "rct2ww.ride.condorrd",
    "rct2ww.ride.dragon",
    "rct2ww.ride.jaguarrd",
    "rct2ww.ride.lionride",
    "rct2ww.ride.rhinorid",
    "rct2ww.ride.rssncrrd",
    "rct2ww.ride.whicgrub",
    
    // Air-Powered Vertical Coasters (~1995)
    "rct2.ride.thcar",
    "rct2tt.ride.hotrodxx",
    "rct2ww.ride.bomerang",
    
    // LIM Launched Coasters (~1997)
    "rct2.ride.premt1",
    "rct2tt.ride.ganstrcr",
    "rct2ww.ride.tgvtrain",
    
    // Floorless Twister (~1999)
    "rct2.ride.bmfl",
    
    // Giga Coasters, Flying RC, Vertical Shuttle, Impulse & Multi-Dimension (~2000s)
    "rct2.ride.intst",
    "rct2.ride.vekdv",
    "rct2ww.ride.taxicstr",
    "rct2.ride.arrx",
    "rct2.ride.bmair",
    "rct2.ride.intinv",
    "rct2tt.ride.barnstrm",
    "rct2tt.ride.pterodac",
    
    // Scenery Groups - Ancient & Classical
    "rct2.scenery_group.scgegypt",
    "rct2.scenery_group.scgclass",
    
    // Medieval & Mythological
    "rct2tt.scenery_group.scgmediv",
    "rct2tt.scenery_group.scgmytho",
    "rct2.scenery_group.scgmedie",
    "rct2.scenery_group.scgpirat",
    "rct2.scenery_group.scgwond",
    "rct2.scenery_group.scgorien",
    
    // Gardens, Nature & Landscape
    "rct2.scenery_group.scggardn",
    "rct2.scenery_group.scgshrub",
    "rct2.scenery_group.scgtrees",
    "rct2.scenery_group.scgfence",
    "rct2.scenery_group.scgwalls",
    "rct2.scenery_group.scgpathx",
    
    // Mining & Industrial
    "rct2.scenery_group.scgmine",
    "rct2.scenery_group.scgindus",
    
    // Western / Frontier
    "rct2.scenery_group.scgwwest",
    
    // Horror & Seasonal
    "rct2.scenery_group.scgspook",
    "rct2.scenery_group.scghallo",
    
    // Jungle & Prehistoric
    "rct2.scenery_group.scgjungl",
    "rct2tt.scenery_group.scgjurra",
    "rct2.scenery_group.scgjuras",
    
    // 1920s / Art Deco
    "rct2tt.scenery_group.scg1920s",
    "rct2tt.scenery_group.scg1920w",
    
    // 1960s / Space Age
    "rct2tt.scenery_group.scg1960s",
    "rct2.scenery_group.scgspace",
    
    // Modern / Abstract / Themed
    "rct2.scenery_group.scgabstr",
    "rct2.scenery_group.scgsnow",
    "rct2.scenery_group.scgmart",
    "rct2.scenery_group.scgcandy",
    "rct2.scenery_group.scggiant",
    "rct2.scenery_group.scgsport",
    "rct2.scenery_group.scgurban",
    "rct2tt.scenery_group.scgfutur",
    
    // Geographic / Regional (Wacky Worlds)
    "rct2ww.scenery_group.scgeurop",
    "rct2ww.scenery_group.scgnamrc",
    "rct2ww.scenery_group.scgasia",
    "rct2ww.scenery_group.scgafric",
    "rct2ww.scenery_group.scgsamer",
    "rct2ww.scenery_group.scgaustr",
    "rct2ww.scenery_group.scgartic",
    
    // Facilities
    "rct2.ride.tlt1",
    "rct2.ride.tlt2",
    "rct2.ride.faid1",
    "rct2.ride.atm1",
    "rct2.ride.infok",
    
    // Merchandise
    "rct2.ride.souvs",
    "rct2tt.ride.softoyst",
    "rct2.ride.hatst",
    "rct2.ride.sungst",
    "rct2.ride.tshrt",
    "rct2tt.ride.1960tsrt",
    "rct2.ride.balln",
    
    // Food
    "rct2.ride.burgb",
    "rct2.ride.chpsh",
    "rct2.ride.chpsh2",
    "rct2.ride.pizzs",
    "rct2.ride.hotds",
    "rct2.ride.popcs",
    "rct2.ride.cndyf",
    "rct2.ride.dough",
    "rct2.ride.cookst",
    "rct2.ride.funcake",
    "rct2.ride.pretst",
    "rct2.ride.icecr2",
    "rct2.ride.toffs",
    "rct2.ride.rsaus",
    "rct2.ride.chknug",
    "rct2.ride.chcks",
    "rct2.ride.substl",
    "rct2.ride.sqdst",
    "rct2.ride.bnoodles",
    "rct2.ride.frnood",
    "rct2.ride.mbsoup",
    "rct2.ride.wonton",
    "rct2tt.ride.medisoup",
    "rct2tt.ride.mythosea",
    "rct2tt.ride.mktstal1",
    "rct2tt.ride.1920sand",
    
    // Drinks
    "rct2.ride.drnks",
    "rct2.ride.lemst",
    "rct2.ride.coffs",
    "rct2.ride.hchoc",
    "rct2.ride.icetst",
    "rct2.ride.soybean",
    "rct2.ride.cindr",
    "rct2.ride.starfrdr",
    "rct2tt.ride.mktstal2",
    "rct2tt.ride.moonjuce"
];

/**
 * Get the identifier for a research item
 */
function getResearchItemIdentifier(item) {
    try {
        var objectType = item.type === 'ride' ? 'ride' : 'scenery_group';
        var obj = objectManager.getObject(objectType, item.object);
        return obj ? obj.identifier : null;
    } catch (e) {
        console.log("Error getting identifier for item: " + e);
        return null;
    }
}

/**
 * Reorganizes the park's invention list to chronological order
 */
function reorganizeToChronological() {
    console.log("Starting chronological reorganization...");
    
    // Get current research items
    var inventedItems = park.research.inventedItems;
    var uninventedItems = park.research.uninventedItems;
    
    // Combine all items
    var allItems = inventedItems.concat(uninventedItems);
    
    console.log("Total items to sort: " + allItems.length);
    
    // Create a map of identifiers to their chronological position
    var orderMap = {};
    for (var i = 0; i < CHRONOLOGICAL_ORDER.length; i++) {
        orderMap[CHRONOLOGICAL_ORDER[i]] = i;
    }
    
    // Sort all items based on chronological order
    allItems.sort(function(a, b) {
        var identifierA = getResearchItemIdentifier(a);
        var identifierB = getResearchItemIdentifier(b);
        
        var orderA = orderMap[identifierA] !== undefined ? orderMap[identifierA] : 999999;
        var orderB = orderMap[identifierB] !== undefined ? orderMap[identifierB] : 999999;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        // If not in our list or same position, maintain original order
        return 0;
    });
    
    // Update the research list - set to uninvented, then reassign to trigger update
    park.research.uninventedItems = allItems;
    park.research.inventedItems = [];
    
    // Reassign to ensure the game updates (pattern from working plugin)
    park.research.inventedItems = [];
    
    console.log("Research items reorganized to chronological order!");
    console.log("Items moved to 'To Be Invented': " + allItems.length);
    
    return allItems.length;
}

/**
 * Creates the plugin window with reorganize button
 */
function openWindow() {
    var window = ui.openWindow({
        classification: "chronological-sorter",
        title: "Chronological Invention Sorter",
        width: 400,
        height: 150,
        widgets: [
            {
                type: "label",
                x: 10,
                y: 20,
                width: 380,
                height: 50,
                text: "Reorganize invention list to match\nreal-world chronological order?\n\n{RED}Warning: All items will be moved to\n'To Be Invented' list."
            },
            {
                type: "button",
                x: 100,
                y: 90,
                width: 200,
                height: 30,
                text: "Reorganize to Chronological",
                onClick: function() {
                    var count = reorganizeToChronological();
                    ui.showError(
                        "Success!",
                        count + " items reorganized."
                    );
                }
            }
        ]
    });
}

// Main plugin entry point
function main() {
    console.log("Chronological Invention Sorter v1.1.0 loaded!");
    
    // Check if we're in a valid game mode
    if (typeof park === 'undefined') {
        console.log("Park not available - plugin requires a loaded game");
        return;
    }
    
    // Add to the map menu
    if (typeof ui !== 'undefined') {
        ui.registerMenuItem("Reorganize Inventions (Chronological)", function() {
            openWindow();
        });
    }
    
    console.log("Plugin ready - access via Map menu > 'Reorganize Inventions (Chronological)'");
}

// Register the plugin
registerPlugin({
    name: "Chronological Invention Sorter",
    version: "1.1.0",
    authors: ["Claude"],
    type: "remote",
    licence: "MIT",
    targetApiVersion: 77,
    main: main
});