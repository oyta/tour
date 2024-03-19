<?php
/* save.php */
header("Content-type: text/plain");

/**
 * Config
 */
$dir = "./";
$json_filenam = "data.js";
$host_json_filename = "hosts.json";
$group_json_filename = "groups.json";
$group_meal_json_filename = "groupmeal.json";


/**
 * Read the POST data
 */
$postdata = file_get_contents("php://input");
$split = explode("\r\n", $postdata);
if( count( $split ) != 2 ) {
    exit( "Data from webpage was not correct." );
}

/**
 * Export to JSON to file.
 * input    path        str     Directory of the file.
 * input    filename    str     Filename of the file to write to.
 * input    varName     str     JS variable name.
 * input    obj         str     Object to export.
 * input    append      bool    Whether to append to the file or not.
 */
function exportToJson( $path, $filename, $varName, $obj, $append ) {
    if( $append ) {
        file_put_contents( $path . $filename, $varName .  $obj . ";", FILE_APPEND | LOCK_EX );
    }
    else {
        file_put_contents( $path . $filename, $varName .  $obj . ";", LOCK_EX );
    }
}


/**
 * Get a new array based on group IDs with route coordinates
 */
function getRouteArrays( $hosts, $groups, $groupMeals ) {
    $returnArray = [];

    foreach( $groupMeals as $group_id => $group_host_array ) {
        $start_pos = ["lat" => 60.382603, "lng" => 5.325932 ]; // Cornerteateret
        $osrm_base = [
            "service" => "route",
            "version" => "v1",
            "profile" => "walking",
            "coordinates" => $start_pos["lng"] . "," . $start_pos["lat"],
            "format" => "json",
        ];

        $osrm_attr = [
            "alternatives" => "false",
            "steps" => "false",
            "overview" => "full",
            "geometries" => "geojson",
            "access_token" => "pk.eyJ1Ijoib3l0YSIsImEiOiJjamJ6a2MxeDUydnFwMzNtZnVvdW1qZ2QyIn0.Pt5Wmf7SMlpROGQnbuWbrg"
        ];

        // Add Coordinates
        foreach( $group_host_array as $host_id ) {
            foreach( $hosts as $host ) {
                if( $host->id == $host_id ) {
                    if( property_exists( $host, "lat" )) {
                        $osrm_base["coordinates"] .= ";" . $host->lng . "," . $host->lat;
                    }
                    else {
                        echo $host->name . " is missing lat!<br>";
                    }
                }
            }
        }
        $osrm_base["coordinates"] .= ";" . $start_pos["lng"] . "," . $start_pos["lat"];
        $osrm_url = "https://api.mapbox.com/directions/v5/mapbox/" . $osrm_base["profile"] . "/" . $osrm_base["coordinates"];

        // Add attributes to the URL
        $i = 0;
        foreach( $osrm_attr as $key => $attr) {
            if( $i == 0 ) {
                $osrm_url .= "?";
            }
            else {
                $osrm_url .= "&";
            }
            $osrm_url .= $key . "=" . $attr; 
            $i++;
        }

        $directions = json_decode( file_get_contents( $osrm_url ));

        $returnArray[ $group_id ] = $directions->routes[0]->geometry->coordinates;
    }
    return $returnArray;
}

/**
 * Generate an group-host-meal-combination array
 */
function groupMeals( $hosts, $groups ) {
    $meals = ["Forrett","Middag","Dessert"];
    $groupMeals = [];
    foreach( $groups as $id => $group ) {
        $groupMeals[ $id ] = [-1,-1,-1];
    }

    foreach( $hosts as $host ) {
        foreach( $meals as $meal ) {
            foreach( $host->$meal as $groupId ) {
                echo "Host: " . $host->id . ", groupID: " . $groupId . "<br>";
                $groupMeals[$groupId][ array_search ( $meal, $meals )] = $host->id;
            }
        }
    }

    return $groupMeals;
}



/**
 * Run the code
 */
exportToJson( $dir, $json_filenam, 'let hosts = ', $split[0], false );
exportToJson( $dir, $json_filenam, 'let groups = ', $split[1], true );

file_put_contents( $dir . $host_json_filename, utf8_encode($split[0]), LOCK_EX );
file_put_contents( $dir . $group_json_filename, utf8_encode($split[1]), LOCK_EX );

//$hosts  = json_decode( file_get_contents( $host_json_filename ));
//$groups = json_decode( file_get_contents( $group_json_filename ));
// $group_routes = getRouteArrays( $hosts, $groups, groupMeals( $hosts, $groups ));
//file_put_contents( $dir . $group_meal_json_filename, json_encode( $group_routes ), LOCK_EX );

echo "Save on server succeded if nothing else was stated.";

?>
