/**
 * TODO
 *
 * _ Gje skriverettigheiter til save.php og backend.php
 * _ Når sido vert lasta -> genererer groupMeals basert på data i hosts og groups.
 * _ Når ein tar "import" -> genererer groupMeals som er tom (-1,-1,-1)
 *
 * */

const MEALS = ["Forrett", "Middag", "Dessert"];
const BASE_URL = "./";

let groupMeals = {}; // Initiate groupMeals.

let createEmptyGroupMeals = function (groups, groupMeals) {
  for (groupId in groupMeals) {
    delete groupMeals[groupId];
  }

  for (group in groups) {
    groupMeals[group] = [-1, -1, -1];
  }

  for (hostId in hosts) {
    for (let i = 0; i < MEALS.length; i++) {
      let host = hosts[hostId];
      for (let j = 0; j < host[MEALS[i]].length; j++) {
        groupMeals[host[MEALS[i]][j]][i] = hostId;
      }
    }
  }
};

let createPenaltyMatrix = function (
  hosts,
  _groupMeals,
  meals,
  _groupId = -1,
  meal = 0,
) {
  let matrix = {};
  let hostMatrix = {};
  let emptyList = {};
  for (groupId in _groupMeals) {
    emptyList[groupId] = 0;
  }
  if (_groupId != -1) {
    matrix[_groupId] = Object.assign({}, emptyList);
    for (let i = 0; i < _groupMeals[_groupId].length; i++) {
      if (_groupMeals[_groupId][i] >= 0) {
        let coGuests = hosts[_groupMeals[_groupId][i]][MEALS[i]];
        for (let j = 0; j < coGuests.length; j++) {
          matrix[_groupId][coGuests[j]]++;
        }
      }
    }
  }
  for (host in hosts) {
    hostMatrix[host] = 0;
    let coGuests = hosts[host][MEALS[meal]];
    for (let i = 0; i < coGuests.length; i++) {
      hostMatrix[host] += matrix[_groupId][coGuests[i]];
    }
  }
  return hostMatrix;
};

let createPenaltyMatrix2 = function (
  _groupMeals,
  _meals,
  _groupId = -1,
  _meal = 0,
) {
  let matrix = {};
  let hostMatrix = {};
  for (_groupId in groupMeals) {
    matrix[_groupId] = 0;
  }

  for (let m = 0; m < _meals.length; m++) {
    if (_groupMeals[_groupId][m] >= 0) {
      let currentHost = _groupMeals[_groupId][m];
      for (_other_gid in _groupMeals) {
        if (_other_gid != _groupId) {
          if (_groupMeals[_other_gid][m] == currentHost) {
            matrix[_other_gid] += 1;
          }
        }
      }
    }
  }

  for (host in hosts) {
    hostMatrix[host] = 0;
    let co_guests = [];
    for (_other_gid in _groupMeals) {
      if (_groupMeals[_other_gid][_meal] == host) {
        hostMatrix[host] = hostMatrix[host] * 2 + matrix[_other_gid];
      }
    }
  }

  return hostMatrix;
};

let createSchedulePenalty = function (
  hosts,
  groups,
  groupMeals,
  meals,
  clearAll = false,
) {
  if (clearAll) {
    // TODO implement the method clear();
  }

  // Sort the groups by count of guests
  let groupsSorted = sortedGroups(groups);

  // Number of free seats per host
  let freeSeatsPerHost = {};
  for (let i = 0; i < MEALS.length; i++) {
    freeSeatsPerHost[MEALS[i]] = freeSeats(hosts, groups, MEALS, -1, true, i);
  }

  let missing = new Array();

  /** Implemenation of multiple runs **/
  // Number of iterations
  let numberOfIter = 1000;

  let freeSeatsPerHost_chosen = Object.assign({}, freeSeatsPerHost);
  let freeSeatsPerHost_running = Object.assign({}, freeSeatsPerHost);

  let groupmeals_chosen = Object.assign({}, groupMeals);
  let groupmeals_running = Object.assign({}, groupMeals);

  let missing_chosen = [];
  let missing_running = [];
  let someMissing = false;

  let maxPenalty_r = 0;
  let maxPenalty_c = 0;
  /** End new impl **/

  let o = 0;
  for (; o < numberOfIter; o++) {
    freeSeatsPerHost_running = {};
    groupmeals_running = {};
    maxPenalty_r = 0;

    for (let i = 0; i < MEALS.length; i++) {
      freeSeatsPerHost_running[MEALS[i]] = freeSeats(
        hosts,
        groups,
        MEALS,
        -1,
        true,
        i,
      );
    }

    createEmptyGroupMeals(groups, groupmeals_running);

    missing_running = [];
    someMissing = false;

    for (let j = 0; j < MEALS.length; j++) {
      for (let i = 0; i < groupsSorted.length; i++) {
        if (groupmeals_running[groupsSorted[i][0]][j] >= 0) {
          continue;
        }
        let hostKeys = Object.keys(hosts); // keys of hosts - the id of them
        let groupId = groupsSorted[i][0]; // a group id
        let unVisitedHosts = hostKeys.filter(
          (x) => groupmeals_running[groupId].indexOf(x) == -1,
        ); // not visited hosts
        let potentialHosts = new Array();
        let countInGroup = groupsSorted[i][1];

        // Remove the host in potentialHosts if there too few seats free for the group
        for (let k = 0; k < unVisitedHosts.length; k++) {
          let host = unVisitedHosts[k];
          if (freeSeatsPerHost_running[MEALS[j]][host] >= countInGroup) {
            potentialHosts.push(host);
          }
        }

        if (potentialHosts.length === 0) {
          missing_running.push([groupId, MEALS[j]]);
          someMissing = true;
          continue;
        }

        // Find the potential host with the least penalty
        let penaltyMatrix = createPenaltyMatrix2(
          groupmeals_running,
          MEALS,
          groupId,
          j,
        );
        let penaltyAndPotential = {};
        for (hostId in penaltyMatrix) {
          if (potentialHosts.indexOf(hostId) >= 0) {
            penaltyAndPotential[hostId] = penaltyMatrix[hostId];
          }
        }
        let sortedPotentialGroups = sortObject(penaltyAndPotential);

        // Reduce array to those who have the same minimum penalty
        let minimumPenalty = sortedPotentialGroups[0][1];
        let cutAtIndex = sortedPotentialGroups.length - 1;
        for (let i = 0; i < sortedPotentialGroups.length; i++) {
          if (sortedPotentialGroups[i][1] > minimumPenalty) {
            cutAtIndex = i - 1;
            break;
          }
        }

        // Choose a random index of those with lowest penalty
        let chosenHostIndex = getRandomInt(0, cutAtIndex);
        let chosenHost = sortedPotentialGroups[chosenHostIndex][0];

        /* Todo implement optional function - choose the hosts with the lowest penalty and among them the one with most free seats.
           if( sortedPotentialGroups[chosenHostIndex][1] > 0 )
               console.log("For group (" + groupId + ") at meal " + MEALS[j] + " the penalty is " + sortedPotentialGroups[chosenHostIndex][1] );
           */

        if (sortedPotentialGroups[chosenHostIndex][1] > maxPenalty_r) {
          maxPenalty_r = sortedPotentialGroups[chosenHostIndex][1];
        }

        // Update freeSeatsPerHost
        freeSeatsPerHost_running[MEALS[j]][chosenHost] =
          freeSeatsPerHost_running[MEALS[j]][chosenHost] - countInGroup;

        // Add host to groupMeal
        groupmeals_running[groupId][j] = chosenHost;
      }
    }

    if (o == 0) {
      console.log(
        o +
          ": " +
          missing_running.length +
          " missing and " +
          maxPenalty_r +
          " max penalty. 0 (chosen).",
      );
      missing_chosen = missing_running.splice(0);
      groupmeals_chosen = Object.assign({}, groupmeals_running);
      maxPenalty_c = maxPenalty_r;
    } else if (missing_running.length < missing_chosen.length) {
      console.log(
        o +
          ": " +
          missing_chosen.length +
          " -> " +
          missing_running.length +
          " missing and " +
          maxPenalty_c +
          " -> " +
          maxPenalty_r +
          " max penalty. 1 (chosen).",
      );
      missing_chosen = missing_running.splice(0);
      groupmeals_chosen = Object.assign({}, groupmeals_running);
      maxPenalty_c = maxPenalty_r;
    } else if (
      missing_running.length == missing_chosen.length &&
      maxPenalty_r < maxPenalty_c
    ) {
      console.log(
        o +
          ": " +
          missing_chosen.length +
          " -> " +
          missing_running.length +
          " missing and " +
          maxPenalty_c +
          " -> " +
          maxPenalty_r +
          " max penalty. 2 (chosen).",
      );
      missing_chosen = missing_running.splice(0);
      groupmeals_chosen = Object.assign({}, groupmeals_running);
      maxPenalty_c = maxPenalty_r;
    }
  }

  // TODO update hosts and groupMeals
  for (let i = 0; i < MEALS.length; i++) {
    for (groupId in groupmeals_chosen) {
      chosenHost = groupmeals_chosen[groupId][i];
      if (chosenHost >= 0) {
        if (!hosts[chosenHost][MEALS[i]].includes(groupId)) {
          hosts[chosenHost][MEALS[i]].push(groupId);
        }
      }
    }
  }
  groupMeals = groupmeals_chosen;
  console.log("Missing");
  console.log(missing_chosen);
  return groupMeals;
};

let countOfGuests = function (groups, groupId = -1) {
  let count = 0;
  if (groupId < 0) {
    for (let _groupId in groups) {
      if (groups.hasOwnProperty(_groupId)) {
        count += groups[_groupId].length;
      }
    }
  } else {
    groups[groupId].length;
  }
  return count;
};

let countOfSeats = function (hosts, hostId = -1) {
  let count = 0;
  if (hostId < 0) {
    for (let _hostId in hosts) {
      if (hosts.hasOwnProperty(_hostId)) {
        count += hosts[_hostId].numberOfSeats;
      }
    }
  } else {
    hosts[hostsId].length;
  }
  return count;
};

let freeSeats = function (
  hosts,
  groups,
  meals,
  hostId = -1,
  perHost = true,
  meal = -1,
) {
  if (meal == -1) {
    console.debug(
      "Method: freeSeats. Error. Input argument 'meal' is undefined.",
    );
    return undefined;
  } else if (hostId < 0 && !perHost) {
    // return total number of free seats
    return countOfSeats(hosts, hostId) - countOfGuests(groups, -1);
  } else if (hostId < 0 && perHost) {
    // return array of count of free seats per host
    let result = {};
    for (let _hostId in hosts) {
      result[_hostId] = freeSeats(hosts, groups, MEALS, _hostId, true, meal);
    }
    return result;
  } else if (hostId != -1) {
    // return the number of free seats of host at a meal
    let seated = hosts[hostId][MEALS[meal]];
    let count = 0;
    if (seated != undefined) {
      for (let i = 0; i < seated.length; i++) {
        count += groups[seated[i]].length;
      }
    }
    return hosts[hostId].numberOfSeats - count;
  }
  console.log("Method: freeSeats: Error. Arguments not as expected.");
  return undefined;
};

let sortObject = function (groups) {
  let sortable = [];
  for (let groupId in groups) {
    sortable.push([groupId, groups[groupId]]);
  }

  sortable.sort(function (a, b) {
    return a[1] - b[1];
  });

  return sortable;
};

let sortedGroups = function (groups) {
  let sortable = [];
  for (let groupId in groups) {
    sortable.push([groupId, groups[groupId].length]);
  }

  sortable.sort(function (a, b) {
    return b[1] - a[1];
  });

  return sortable;
};

let drawSchedule = function (div, hosts, groups, meals) {
  document.querySelector(div).innerHTML = "";
  for (let i = 0; i < MEALS.length; i++) {
    let meal = MEALS[i];
    $(div).append(
      "<div class='element-meal-" +
        meal +
        "' data-meal-id='" +
        meal +
        "'></div>",
    );
    $(".element-meal-" + meal).append("<div class='heading'></div>");
    $(".element-meal-" + meal + " .heading").append("Meal: " + meal);

    for (host in hosts) {
      let freeSeatsAtMeal = freeSeats(hosts, groups, MEALS, host, true, i);
      $(".element-meal-" + meal).append(
        "<div class='element-host-" +
          host +
          "' data-host-id='" +
          host +
          "'></div>",
      );
      $(".element-meal-" + meal + " .element-host-" + host).append(
        "<div class='heading'></div>",
      );
      $(
        ".element-meal-" + meal + " .element-host-" + host + " .heading",
      ).append("Host: " + hosts[host].name + " (" + freeSeatsAtMeal + ")");

      for (let j = 0; j < hosts[host][meal].length; j++) {
        let groupId = hosts[host][meal][j];
        $(
          "<div class='element-group-" +
            groupId +
            "' data-group-id='" +
            groupId +
            "'></div>",
        )
          .appendTo(".element-meal-" + meal + " .element-host-" + host)
          .mouseenter(function () {
            $(".element-group-" + groupId).toggleClass("highlight", true);
          })
          .mouseout(function () {
            $(".element-group-" + groupId).toggleClass("highlight", false);
          })
          .click(function () {
            $(".element-group-" + groupId).toggleClass("selected");
          })
          .attr({
            draggable: "true",
          });

        for (let k = 0; k < groups[groupId].length; k++) {
          $(
            ".element-meal-" +
              meal +
              " .element-host-" +
              host +
              " .element-group-" +
              groupId,
          ).append(
            groups[groupId][k].firstname +
              " " +
              groups[groupId][k].lastname +
              "<br/>",
          );
        }
      }

      for (let j = 0; j < freeSeatsAtMeal; j++) {
        $("<div class='element-empty'>&nbsp;</div>").appendTo(
          ".element-meal-" + meal + " .element-host-" + host,
        );
      }
    }
  }
};

let clearSchedule = function (hosts, groups, groupMeals) {
  for (host in hosts) {
    for (let i = 0; i < MEALS.length; i++) {
      hosts[host][MEALS[i]].length = 0;
    }
  }

  // Make new groupMeals array
  createEmptyGroupMeals(groups, groupMeals);
  drawGroups("#groups", groups, groupMeals);
  drawSchedule("#schedule", hosts, groups, MEALS);
  addDragListeners();
};

let drawGroups = function (div, groups, groupMeals) {
  document.querySelector(div).innerHTML = "";
  for (group in groupMeals) {
    let groupId = group;
    let title = "";
    $(div).append(
      "<div class='group-meals' id='group-" + groupId + "-meals'></div>",
    );
    $(
      "<div class='group-guests element-group-" +
        groupId +
        "' data-group-id='" +
        groupId +
        "' id='group-" +
        groupId +
        "-guests' draggable='true'></div>",
    )
      .appendTo(div)
      .mouseenter(function () {
        $(".element-group-" + groupId).toggleClass("highlight", true);
      })
      .mouseout(function () {
        $(".element-group-" + groupId).toggleClass("highlight", false);
      })
      .click(function () {
        $(".element-group-" + groupId).toggleClass("selected");
      });
    for (let i = 0; i < groups[groupId].length; i++) {
      $("#group-" + groupId + "-guests").append(
        groups[groupId][i].firstname + " " + groups[groupId][i].lastname,
      );
      title += groups[groupId][i].groupMembers;
      if (i + 1 < groups[groupId].length)
        $("#group-" + groupId + "-guests").append(", ");
    }
    let b = document.querySelector("#group-" + groupId + "-guests");
    b.setAttribute("title", title);

    for (let i = 0; i < groupMeals[groupId].length; i++) {
      $("#group-" + groupId + "-meals").append(
        groupMeals[groupId][i] < 0 ? "&#11046;" : "&#10003;",
      );
    }
  }
};

let moveVisit = function (hosts, groupMeals, meals, meal, toHost, group) {
  removeVisit(hosts, groupMeals, MEALS, meal, group);
  addVisit(hosts, groupMeals, MEALS, meal, toHost, group);
};

let removeVisit = function (hosts, groupMeals, meals, meal, group) {
  let mealIndex = MEALS.indexOf(meal);
  let currentHost = groupMeals[group][mealIndex];

  if (currentHost >= 0) {
    let groupIndex = hosts[currentHost][meal].indexOf(group);
    hosts[currentHost][meal].splice(groupIndex, 1);
    groupMeals[group][mealIndex] = -1;
  }
};

let addVisit = function (hosts, groupMeals, meals, meal, host, group) {
  let mealIndex = MEALS.indexOf(meal);
  groupMeals[group][mealIndex] = host;

  hosts[host][meal].push(group);
};

let groupMerging = function (groupMeals, groups) {
  let groupId_selected = [];

  // Get all the DIV-elements that are selected
  let dom_selected = document.querySelectorAll(".group-guests.selected");
  if (dom_selected.length < 2) return false;

  // Get their special attribute data-group-id and save them in a separate array
  for (let i = 0; i < dom_selected.length; i++) {
    groupId_selected.push(
      dom_selected[i].attributes.getNamedItem("data-group-id").value,
    );
  }

  // Merge all the selected groups into one
  let groupId_merge = groupId_selected[0];
  for (let i = 1; i < groupId_selected.length; i++) {
    let tmpGroup = groups[groupId_selected[i]];
    for (let j = 0; j < tmpGroup.length; j++) {
      groups[groupId_merge].push(tmpGroup[j]);
    }
  }

  // Delete the groups that are merged
  for (let i = 1; i < groupId_selected.length; i++) {
    delete groups[groupId_selected[i]];
  }

  // Make new groupMeals array
  createEmptyGroupMeals(groups, groupMeals);
  drawGroups("#groups", groups, groupMeals);
  drawSchedule("#schedule", hosts, groups, MEALS);
  addDragListeners();
};

let pickRandomProperty = function (obj) {
  var result;
  var count = 0;
  for (var prop in obj) if (Math.random() < 1 / ++count) result = prop;
  return result;
};

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 * https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
 */
let getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 *
 * Drag and drop handling
 *
 **/
function handleDragStart(ev) {
  let visitArray = [];
  if (ev.target.parentNode.attributes.hasOwnProperty("data-host-id")) {
    visitArray[0] =
      ev.target.parentNode.parentNode.attributes.getNamedItem(
        "data-meal-id",
      ).value;
    visitArray[1] = ev.target.attributes.getNamedItem("data-group-id").value;
  } else {
    visitArray[0] = false;
    visitArray[1] = ev.target.attributes.getNamedItem("data-group-id").value;
  }
  // Add the target element's id to the data transfer object
  ev.dataTransfer.setData("text/plain", JSON.stringify(visitArray));
  ev.dataTransfer.setData("text/html", ev.target.innerHTML);
  ev.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Necessary. Allows us to drop.
  }
  e.dataTransfer.dropEffect = "move"; // See the section on the DataTransfer object.
  return false;
}

function handleDragEnter(e) {
  this.classList.add("over"); // this / e.target is the current hover target.
}

function handleDragLeave(e) {
  this.classList.remove("over"); // this / e.target is previous target element.
}

function handleDrop(e) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  if (e.stopPropagation) {
    e.stopPropagation(); // stops the browser from redirecting.
  }

  if (this.id == "groups") {
    let oldVisitArray = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (oldVisitArray[0] != false) {
      removeVisit(hosts, groupMeals, MEALS, oldVisitArray[0], oldVisitArray[1]);
      drawGroups("#groups", groups, groupMeals);
      drawSchedule("#schedule", hosts, groups, MEALS);
      addDragListeners();
    }
  } else {
    // this / e.target is current target element.
    this.innerHTML = e.dataTransfer.getData("text/html");
    let newVisitArray = [];
    newVisitArray[0] =
      e.target.parentNode.parentNode.attributes.getNamedItem(
        "data-meal-id",
      ).value;
    newVisitArray[1] =
      e.target.parentNode.attributes.getNamedItem("data-host-id").value;
    let oldVisitArray = JSON.parse(e.dataTransfer.getData("text/plain"));

    moveVisit(
      hosts,
      groupMeals,
      MEALS,
      newVisitArray[0],
      newVisitArray[1],
      oldVisitArray[1],
    );
    drawGroups("#groups", groups, groupMeals);
    drawSchedule("#schedule", hosts, groups, MEALS);
    addDragListeners();
  }
  return false;
}

function handleDragEnd(e) {
  // this/e.target is the source node.
  let groupElements = document.querySelectorAll(".element-empty");
  [].forEach.call(groupElements, function (group) {
    group.classList.remove("over");
  });
}

function addDragListeners() {
  let groupElements = document.querySelectorAll("div[class*='element-group']");
  [].forEach.call(groupElements, function (group) {
    group.addEventListener("dragstart", handleDragStart, false);
    group.addEventListener("dragend", handleDragEnd, false);
  });

  let hostElements = document.querySelectorAll(".element-empty, #groups");
  [].forEach.call(hostElements, function (host) {
    host.addEventListener("dragenter", handleDragEnter, false);
    host.addEventListener("dragover", handleDragOver, false);
    host.addEventListener("dragleave", handleDragLeave, false);
    host.addEventListener("drop", handleDrop, false);
  });
}

let addMenuAction = function (groupMeals, groups) {
  document.querySelector("#menu-run").addEventListener("click", function (e) {
    createSchedulePenalty(hosts, groups, groupMeals, MEALS, false);
    createEmptyGroupMeals(groups, groupMeals);
    drawGroups("#groups", groups, groupMeals);
    drawSchedule("#schedule", hosts, groups, MEALS);
    addDragListeners();
    showPopup("Plan generert.");
    return false;
  });

  document
    .querySelector("#menu-grouping")
    .addEventListener("click", function (e) {
      groupMerging(groupMeals, groups);
      showPopup("Gruppering utført");
    });

  document.querySelector("#menu-save").addEventListener("click", function (e) {
    showPopup("Lagrer...");
    saveRequest();
  });

  document
    .querySelector("#menu-clear-schedule")
    .addEventListener("click", function (e) {
      clearSchedule(hosts, groups, groupMeals);
      showPopup("Planen er sletta. Endring ikkje lagra.");
    });
};

/**
 * AJAX save changes to server
 * TODO fullfør denne funksjonen og lag PHP-scriptet som skal til
 **/
let httpRequest;
let saveRequest = function () {
  httpRequest = new XMLHttpRequest();

  if (!httpRequest) {
    alert("Giving up :( Cannot create an XMLHTTP instance");
    return false;
  }

  httpRequest.onreadystatechange = alertSaveResult;
  httpRequest.open("POST", BASE_URL + "controller/save.php");
  httpRequest.setRequestHeader(
    "Content-Type",
    "application/x-www-form-urlencoded",
  );
  //httpRequest.setRequestHeader( 'Content-Type', 'text/plain' );
  httpRequest.send(JSON.stringify(hosts) + "\r\n" + JSON.stringify(groups));
};

let alertSaveResult = function () {
  if (httpRequest.readyState === XMLHttpRequest.DONE) {
    if (httpRequest.status === 200) {
      var response = httpRequest.responseText;
      console.log(response);
      showPopup("Lagring gjekk ok!");
    } else {
      showPopup("Det var eit problem med lagring mot serveren.");
    }
  }
};

let timeoutID = -1;
let showPopup = function (msg) {
  let popup = document.querySelector("#popup");
  if (timeoutID >= 0) {
    window.clearTimeout(timeoutID);
    timeoutID = -1;
  } else {
    popup.className = popup.className ? "" : "fade";
  }
  popup.innerHTML = msg;
  timeoutID = window.setTimeout(function () {
    let popup = document.querySelector("#popup");
    popup.className = popup.className ? "" : "fade";
    timeoutID = -1;
  }, 8000);
};

function addScheduleClickHandler() {
  const scheduleEl = document.getElementById("schedule");
  scheduleEl.addEventListener("click", (e) => {
    if (!e.target.classList.contains("heading")) {
      return;
    }
    const parent = e.target.parentElement;

    if (parent.querySelectorAll("[class*=selected]").length > 0) {
      parent.querySelectorAll("[class*=element-group-]").forEach((e, i) => {
        setSelected(e, false);
      });
    } else {
      parent.querySelectorAll("[class*=element-group-]").forEach((e, i) => {
        setSelected(e, true);
      });
    }
  });
}

function setSelected(el, selected = false) {
  let selector = ".element-group-" + el.dataset.groupId;
  document.querySelectorAll(selector).forEach((e, i) => {
    if (selected) {
      e.classList.add("selected");
    } else {
      e.classList.remove("selected");
    }
  });
}
/**
 * Document ready and setting it up
 * */
$(document).ready(function () {
  createEmptyGroupMeals(groups, groupMeals);
  drawGroups("#groups", groups, groupMeals);
  drawSchedule("#schedule", hosts, groups, MEALS);
  addDragListeners();
  addMenuAction(groupMeals, groups);
  addScheduleClickHandler();
});
