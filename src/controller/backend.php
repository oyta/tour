<?php

/**
 * Config
 */
$dir = "./";
$host_filename = "../inputFiles/Verter.csv";
$guest_filename = "../inputFiles/Paameldte.csv";
$json_filename = "../generated/data.js";

/**
 * Import hosts
 * input    path        str
 * input    filename    str
 */
function importHosts($path, $filename)
{
    $hostArray = [];
    $rows = file($path . $filename);
    /**
     *  CSV Format
     *  #;Navn;Antall gjester;Adresse;Leilighet;Telefon;Epost;Kommentar;
     */
    $keys = [
        "id",
        "name",
        "numberOfSeats",
        "address",
        "appartment",
        "phone",
        "email",
        "comment",
    ];
    foreach ($rows as $rowNum => $row) {
        if ($rowNum > 0) {
            $rowArray = array_combine($keys, explode(";", $row));
            $rowArray["Forrett"] = [];
            $rowArray["Middag"] = [];
            $rowArray["Dessert"] = [];

            array_push($hostArray, $rowArray);
        }
    }
    return $hostArray;
}

/**
 * Import guests
 * input    path        str
 * input    filename    str
 */
function importGuests($path, $filename)
{
    $hostArray = [];
    $rows = file($path . $filename);
    /**
     * CSV Format
     * OrderID;Etternavn;Fornavn;E-postadresse;Mobil;Klasse/kategori;Pris;Betalingsmetode;Bestilt;Betalt;Utbetalt;Allergiar?;Følge? Hele navnet til følge er påkrevd
     */
    $keys = [
        "id",
        "lastname",
        "firstname",
        "email",
        "phone",
        "category",
        "price",
        "paymentMethod",
        "orderDate",
        "payDate",
        "refund",
        "allergies",
        "groupMembers",
    ];
    foreach ($rows as $rowNum => $row) {
        if ($rowNum > 0) {
            $rowArray = array_combine($keys, explode(";", $row));

            $hostArray[$rowNum] = [];
            array_push($hostArray[$rowNum], $rowArray);
        }
    }
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
function exportToJson($path, $filename, $varName, $obj, $append)
{
    if ($append) {
        file_put_contents(
            $path . $filename,
            utf8_encode("\r\n" . $varName . json_encode($obj) . ";"),
            FILE_APPEND | LOCK_EX
        );
    } else {
        file_put_contents(
            $path . $filename,
            utf8_encode($varName . json_encode($obj) . ";"),
            LOCK_EX
        );
    }
}

/**
 * Run the code
 */
$hosts = importHosts($dir, $host_filename);
$guests = importGuests($dir, $guest_filename);

exportToJson($dir, $json_filename, "let hosts = ", $hosts, false);
exportToJson($dir, $json_filename, "let groups = ", $guests, true);

header("Location: ../index.html"); /* Redirect browser */
exit();
?>
