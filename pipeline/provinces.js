/* =====================================================================
   provinces.js — target provinces for the pipeline, identified by their
   real OSM administrative boundary *relation*, not a bounding box.

   Why not a bbox: a rectangle drawn around an irregularly-shaped province
   necessarily overextends past its actual borders. Verified this the hard
   way — a bbox around Laguna reached far enough to include a chunk of
   Metro Manila, and ~32% of the "Laguna" POIs a first pass pulled were
   actually Makati/Manila landmarks (Ayala Museum, Rizal Monument, Tomb of
   the Unknown Soldier). Querying by the province's real OSM polygon
   (`area["name"=...]`) instead of `(south,west,north,east)` fixed it —
   verified: a Laguna museum query with the polygon returned 6 real Laguna
   towns and zero Metro Manila leakage.

   `relationId` is each province's OSM administrative boundary relation —
   confirmed live via Overpass, disambiguated by ISO3166-2 (there are
   multiple same-named "Laguna"/"Batangas" boundaries worldwide — Brazil,
   Puerto Rico, etc. — admin_level=4 + an ISO3166-2 starting with "PH-" is
   what actually identifies the Philippine province):

     [out:json];relation["name"="<Province>"]["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^PH-"];out tags;

   `areaId` is Overpass's own convention for turning a relation into a
   queryable area: 3600000000 + relationId. adapters/overpass.js uses this
   directly, not lat/lng math.
   ===================================================================== */

module.exports = {
  laguna:     { relationId: 1503483, areaId: 3601503483, isoCode: "PH-LAG" },
  batangas:   { relationId: 1504427, areaId: 3601504427, isoCode: "PH-BTG" },
  quezon:     { relationId: 1504500, areaId: 3601504500, isoCode: "PH-QUE" },
  marinduque: { relationId: 1506331, areaId: 3601506331, isoCode: "PH-MAD" },
};
