var divClone;
var myDataArray;
var authorsArray;
var pubDatesArray;
var th = null;
var itemCount = 0;
var mostCommonAuthor;
var mostCommonAuthorCount = 0;
var earliestPublicationDate = null;
var latestPublicationDate = null;
var earliestBook;
var latestBook;
var serverResponse;
var startIndex = 0;
var searchString;
var prevSearchString
var table
var theadRow
var tbody
var navigation
var paginationConfig

window.onload = function () {
  var prevButtonElement = document.getElementById("prev");
  var nextButtonElement = document.getElementById("next");

  if (prevButtonElement) {
    prevButtonElement.addEventListener("click", prevClick);
  }

  if (nextButtonElement) {
    nextButtonElement.addEventListener("click", nextClick);
  }

  divClone = $("#bookTable").clone();
};

function prevClick() {
  changePage("prev");
}

function nextClick() {
  changePage("next");
}

async function queryBooksAPI() {
  $("#bookTable").replaceWith(divClone);
  searchString = document.getElementById("txtInput").value;
  
  if (searchString != prevSearchString) {
    // initialise the metadata
    prevSearchString = searchString;
    itemCount = 0;
    /*myDataArray = [];*/
    authorsArray = [];
    pubDatesArray = [];
    //th = null;
    itemCount = 0;
    mostCommonAuthor = null;
    mostCommonAuthorCount = 0;
    earliestPublicationDate = null;
    latestPublicationDate = null;
    earliestBook = null;
    latestBook = null;
    serverResponse = null;
    startIndex = 0;
  }
  
  var apiUri = `https://www.googleapis.com/books/v1/volumes?q={${searchString}}&maxResults=40&startIndex=${startIndex}`;
  var apiUrl = encodeURI(apiUri);
  var t1 = Date.now();
  var t2;
  const response = await fetch(apiUrl);
  const bookList = await response.json();
  t2 = Date.now();
  var rt = t2 - t1;
  var serverResponseField = document.getElementById("responseTime");
  serverResponseField.textContent = rt;
  itemCount = 0;
  itemCount = bookList.totalItems;
  var itemCountField = document.getElementById("responseCount");
  itemCountField.textContent = itemCount;
  handleResponse(bookList);
}

function handleResponse(response) {
  table = document.querySelector("table");
  theadRow = table.querySelector("thead tr");
  tbody = table.querySelector("tbody");
  navigation = document.querySelector(".navigation");
  paginationConfig = {
    resultsPerPage: 10,
  };
  // set default page start
  table.dataset.recordStart = 0;
  table.dataset.recordEnd = paginationConfig.resultsPerPage - 1;

  myDataArray = [];
  authorsArray = [];

  for (var i = 0; i < response.items.length; i++) {
    var item = response.items[i];
    var authors = item.volumeInfo.authors;
    var authorList = "";
    if (authors != undefined) {
      for (var j = 0; j < authors.length; j++) {
        var authorName = item.volumeInfo.authors[j];
        if (j < authors.length - 1) {
          authorList = authorList + authorName + ", ";
          authorsArray.push({ authorName });
        } else {
          authorList = authorList + authorName;
          authorsArray.push({ authorName });
        }
      }
    }

    myDataArray.push({
      id: item.id,
      authors: authorList,
      title: item.volumeInfo.title,
      description: item.volumeInfo.description,
    });

    var publishedDate = item.volumeInfo.publishedDate;
    if (publishedDate != undefined) {
      if (publishedDate > latestPublicationDate) {
        latestPublicationDate = publishedDate;
        latestBook = item.volumeInfo.title;
      }

      if (earliestPublicationDate === null) {
        earliestPublicationDate = publishedDate;
        earliestBook = item.volumeInfo.title;
      } else if (earliestPublicationDate > publishedDate) {
        earliestPublicationDate = publishedDate;
        earliestBook = item.volumeInfo.title;
      }
    }
  }

  var earliestDateField = document.getElementById("earliestDate");
  earliestDateField.textContent = earliestPublicationDate;
  var earliestBookField = document.getElementById("earliestBook");
  earliestBookField.textContent = earliestBook;
  var latestDateField = document.getElementById("latestDate");
  latestDateField.textContent = latestPublicationDate;
  var latestBookField = document.getElementById("latestBook");
  latestBookField.textContent = latestBook;
  displayDefaultTablePage(myDataArray);
  trackMostCommonAuthor(authorsArray);
}

function displayDefaultTablePage(data) {
  let currentRecordStart = parseInt(table.dataset.recordStart);
  let currentRecordEnd = parseInt(table.dataset.recordEnd);
  if (th == null) {
    let headerLabels = Object.keys(data[0]);
    for (let i = 0; i < headerLabels.length; i++) {
      th = document.createElement("th");
      th.textContent = headerLabels[i];
      theadRow.append(th);
    }
  }

  let recordsToDisplay = data.slice(currentRecordStart, currentRecordEnd + 1);
  createTbodyCells(recordsToDisplay);
  //hide the columns we don't want to display on the screen
  hideColumns();
  //add click handlers to the rows to enable displaying the description
  addRowHandlers();
}

// determine direction and initialize the page change
var waiting = false;
async function changePage(direction) {
  if (waiting) return;

  let currentRecordStart = parseInt(table.dataset.recordStart);
  let currentRecordEnd = parseInt(table.dataset.recordEnd);

  if (direction === "next") {
    if (currentRecordEnd + 1 > myDataArray.length) {
      return;
    }
    let newStart = currentRecordEnd + 1;
    let newEnd = newStart + paginationConfig.resultsPerPage - 1;

    table.dataset.recordStart = newStart;
    table.dataset.recordEnd = newEnd;
    if (newEnd > myDataArray.length) {
      startIndex += 41;
      waiting = true;
      queryBooksAPI();
      waiting = false;
      return;
    }
    let recordsToDisplay = myDataArray.slice(newStart, newEnd + 1);

    createTbodyCells(recordsToDisplay);
  } else if (direction === "prev") {
    var newStart;
    var newEnd;
    if (currentRecordStart == 0 && startIndex == 0) {
      return;
    }
    if (currentRecordStart == 0 && startIndex > 0) {
      startIndex -= 41;
      waiting = true;
      await queryBooksAPI();
      waiting = false;
      newEnd = myDataArray.length - 1;
      newStart = newEnd - paginationConfig.resultsPerPage + 1;
    } else {
      newEnd = currentRecordStart - 1;
      newStart = newEnd - paginationConfig.resultsPerPage + 1;
    }

    table.dataset.recordStart = newStart;
    table.dataset.recordEnd = newEnd;
    let recordsToDisplay = myDataArray.slice(newStart, newEnd + 1);

    createTbodyCells(recordsToDisplay);
  } else {
    return;
  }
  //hide the columns we don't want to display on the screen
  hideColumns();
  addRowHandlers();
}

// add records to DOM
function createTbodyCells(records) {
  tbody.textContent = "";
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    let tr = document.createElement("tr");
    for (const key in record) {
      if (Object.hasOwnProperty.call(record, key)) {
        let td = document.createElement("td");
        td.textContent = record[key];
        tr.append(td);
      }
    }
    tbody.append(tr);
  }
}

function hideColumns() {
  var rows = document.getElementById("bookTable").rows;

  for (var row = 0; row < rows.length; row++) {
    var cols = rows[row].cells;
    cols[0].style.display = "none";
    cols[3].style.display = "none";
  }
}

function addRowHandlers() {
  var table = document.getElementById("bookTable");
  var rows = table.getElementsByTagName("tr");
  for (var i = 0; i < rows.length; i++) {
    var currentRow = table.rows[i];
    var createClickHandler = function (row) {
      return function () {
        var descCell = row.getElementsByTagName("td")[3];
        var desc = descCell.innerHTML;
        if (desc == "") {
          desc = "No description found for this title";
        }
        var titleCell = row.getElementsByTagName("td")[2];
        var title = titleCell.innerHTML;
        showDescription(title, desc);
      };
    };
    currentRow.onclick = createClickHandler(currentRow);
  }
}

function showDescription(title, description) {
  // Create a custom pop-up to show the book description
  const descriptionBox = document.createElement("div");
  descriptionBox.className = "custom-alert";
  descriptionBox.innerHTML = `
      <h2>${title}</h2>
      <p>${description}</p>
      <button onclick="document.body.removeChild(this.parentElement)">Close</button>
    `;
  document.body.appendChild(descriptionBox);
}

function trackMostCommonAuthor(authorArray) {
  // Initialize variables to track the most frequent item, its frequency, and the current item's frequency
  var mf = 1;
  var m = 0;
  var item;
  // Iterate through the array to find the most frequent item
  for (var i = 0; i < authorArray.length; i++) {
    // Nested loop to compare the current item with others in the array
    for (var j = i; j < authorArray.length; j++) {
      // Check if the current item matches with another item in the array
      if (JSON.stringify(authorArray[i]) == JSON.stringify(authorArray[j])) m++;
      // Update the most frequent item and its frequency if the current item's frequency is higher
      if (mf < m) {
        mf = m;
        item = JSON.stringify(authorArray[i]);
      }
    }
    // Reset the current item's frequency for the next iteration
    m = 0;
  }

  var authorObject = JSON.parse(item);
  var authorName1 = authorObject.authorName;
  // Output the most frequent item and its frequency
  var mostCommonAuthorField = document.getElementById("mostCommonAuthor");
  mostCommonAuthorField.textContent = authorName1;
  var mostCommonAuthorCountField = document.getElementById(
    "mostCommonAuthorCount"
  );
  mostCommonAuthorCountField.textContent = mf;
}
