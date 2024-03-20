<?php

/**
 * Config
 */
$dir = "./";
$host_filename  = "Verter.csv";
$guest_filename = "Paameldte.csv";
$json_filename = "data.js";

/**
 * Import hosts
 * input    path        str
 * input    filename    str
 */
function importHosts( $path, $filename ) {
    $hostArray = array();
    $rows = file( $path . $filename );
    /**
     *  CSV Format
     *  #;Navn;Antall gjester;Adresse;Leilighet;Telefon;Epost;Kommentar;
     */
    $keys = [ "id", "name", "numberOfSeats", "address" , "appartment", "phone", "email", "comment" ];
    foreach( $rows as $rowNum => $row ) {
        if( $rowNum > 0 ) {
            $rowArray = array_combine( $keys, explode( ";", $row ));
            $rowArray["Forrett"] = array();
            $rowArray["Middag"]     = array();
            $rowArray["Dessert"]    = array();

            array_push( $hostArray, $rowArray );
        }
    }
    return $hostArray;
}


/**
 * Import guests
 * input    path        str
 * input    filename    str
 */
function importGuests( $path, $filename ) {
    $hostArray = array();
    $rows = file( $path . $filename );
    /**
     * CSV Format
     * OrderID;Etternavn;Fornavn;E-postadresse;Mobil;Klasse/kategori;Pris;Betalingsmetode;Bestilt;Betalt;Utbetalt;Allergiar?;Følge? Hele navnet til følge er påkrevd
     */
    $keys = ["id", "lastname", "firstname", "email", "phone", "category", "price", "paymentMethod", "orderDate","payDate","refund","allergies","groupMembers" ];
    foreach( $rows as $rowNum => $row ) {
        if( $rowNum > 0 ) {
            $rowArray = array_combine( $keys, explode( ";", $row ));

            $hostArray[$rowNum] = array();
            array_push( $hostArray[$rowNum], $rowArray );
        }
    }
    return $hostArray;
}

/**
 * Get coordinates for address strings on Moehlenpris.
 * Source: http://ws.geonorge.no//AdresseWS/adresse/boundingbox?nordLL=60.3820828&austLL=5.3193965&nordUR=60.3866123&austUR=5.327173&antPerSide=1000
 * Source response saved in adresse.json locally
 * input    hostarray   obj
 */
function getCoordinates( $hostArray ) {
    $address_url = "./adresse.json";
    $address_contents = file_get_contents( $address_url );
    $addresses = json_decode( file_get_contents( $address_url ));

    foreach( $hostArray as &$host ) {
        $address_array = explode( " ", $host['address']); // Split address string by space
        $number = $address_array[ count( $address_array )-1 ]; // House number
        $street = substr( $host['address'], 0, strrpos( $host['address'], " ", -1 )); // Street name

        $adresseliste = $addresses->adresser;

        $found = false;
        foreach( $adresseliste as $adr_row ) {
            if( strcasecmp( $adr_row->adressenavn, $street ) == 0 ) {
                if( strcasecmp( $adr_row->husnr, $number ) == 0  ) {
                    $host['lat'] = $adr_row->nord;
                    $host['lng'] = $adr_row->aust;
                    $found = true;
                }
            }
        }

        if( !$found ) {
            echo "Did not find " . $street . " " . $number . "<br/>";
        }
    }
    unset($host);
    return $hostArray;
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
        file_put_contents( $path . $filename, utf8_encode( "\r\n" . $varName . json_encode( $obj ) . ";"), FILE_APPEND | LOCK_EX );
    }
    else {
        file_put_contents( $path . $filename, utf8_encode( $varName . json_encode( $obj ) . ";"), LOCK_EX );
    }
}

/**
 * Run the code
 */
$hosts  = importHosts( $dir, $host_filename );
$guests = importGuests( $dir, $guest_filename );

//$hosts = getCoordinates( $hosts ); // Adding coordinates for the given addresses

exportToJson( $dir, $json_filename, 'let hosts = ', $hosts, false );
exportToJson( $dir, $json_filename, 'let groups = ', $guests, true );

header("Location: http://oystein.taskjelle.no/tour2023-prod"); /* Redirect browser */
exit();
?>
