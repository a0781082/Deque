//initialise global variables
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
var prevButtonElement
var nextButtonElement
var searchButtonElement

//run window onload actions:
//- creat event listeners for the prev and next buttons
//- create clone of book table so that it is easy to reinitialise table
//  in the event of a change of search criteria
window.onload = function () {
  searchButtonElement = document.getElementById("searchButton")
  prevButtonElement = document.getElementById("prev");
  nextButtonElement = document.getElementById("next");

  //add searchButton mouse hover listeners
  searchButtonElement.addEventListener('mouseover', () => {
    searchButtonElement.style.backgroundColor = 'red';
  })
  searchButtonElement.addEventListener('mouseout', () => {
    searchButtonElement.style.backgroundColor = '';
  })

  if (prevButtonElement) {
    prevButtonElement.addEventListener("click", prevClick);
  }

  if (nextButtonElement) {
    nextButtonElement.addEventListener("click", nextClick);
  }
  //hide nav buttons on load as they do not make sense without any table data
  prevButtonElement.style.visibility = "hidden";
  nextButtonElement.style.visibility = "hidden";
  divClone = $("#bookTable").clone();
};

// catch prevClick and invoke change page functionaility
function prevClick() {
  changePage("prev");
}

// catch nextClick and invoke change page functionaility
function nextClick() {
  changePage("next");
}

//function to call the google books API
async function queryBooksAPI() {
  //clear the book table so it is ready for new content
  $("#bookTable").replaceWith(divClone);

  //get the new search criteria from the age
  searchString = document.getElementById("txtInput").value;

  //if the search criteria has changed then reinitialise the 
  //working storage to ensure clean execution
  if (searchString != prevSearchString) {
    // initialise the metadata
    prevSearchString = searchString;
    itemCount = 0;
    authorsArray = [];
    pubDatesArray = [];
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
  //setup the REST API call string
  //Notes:
  //using the maxResponse parameter and setting it to 40 as per the API documentation
  //using the startIndex parameter to facilitate 'next set' processing 
  //(to load the next 40 items from the Response as required)
  var apiUri = `https://www.googleapis.com/books/v1/volumes?q={${searchString}}&maxResults=40&startIndex=${startIndex}`;
  var apiUrl = encodeURI(apiUri);

  //set the 'start' variables to facilitate timing the service response
  var t1 = Date.now();
  var t2;
  //make the REST call and fetch the response
  const response = await fetch(apiUrl);
  const bookList = await response.json();
  //set the 'end' variables to faciliate timing the service response
  t2 = Date.now();

  //calculate the service response in ms and display the time on the page
  var rt = t2 - t1;
  var serverResponseField = document.getElementById("responseTime");
  serverResponseField.textContent = rt;

  //send the REST response the the response handler for further processing
  handleResponse(bookList);
}

//REST API Response Handler
function handleResponse(response) {
  //get the number of items found in the REST call
  // NOTE: this is the number of items returned to the 'totalItems' field in the 
  // REST response - not the number of items returned from the API call.
  // display this number on the page.
  // DEVELOPER NOTE:
  // this number seems to change each time a new set of 40 records is retrieved. 
  // The number being reported here is the number returned in the totalItems parameter - 
  // something anomalous seems to be happening in the server side processing here as the REST 
  // query is the same - other than the startIndex parameter.
  // Further investigation into the server side processing and documentation is required.
  itemCount = 0;
  itemCount = response.totalItems;
  var itemCountField = document.getElementById("responseCount");
  itemCountField.textContent = itemCount;

  //initialise the table in readiness for displaying the responses
  //item data
  table = document.querySelector("table");
  theadRow = table.querySelector("thead tr");
  tbody = table.querySelector("tbody");
  navigation = document.querySelector(".navigation");

  //set the number of items to display in the page
  paginationConfig = {
    resultsPerPage: 10,
  };

  // set default page start
  table.dataset.recordStart = 0;
  table.dataset.recordEnd = paginationConfig.resultsPerPage - 1;

  //initialise arrays 
  myDataArray = [];
  authorsArray = [];

  //process the authors and 'comma delimit' each one if there is more than
  //one author per book
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

    //write the response data for displaying on the page
    myDataArray.push({
      id: item.id,
      authors: authorList,
      title: item.volumeInfo.title,
      description: item.volumeInfo.description,
    });

    //keep track of earliest and latest publication dates fore the retrieved 
    //records
    //DEVELOPER NOTE:
    //currently this processing only works on the actual data returned by the
    //REST API call - so the data will potentailly update when each subsequent set
    //of 40 records is retrieved.  Once retrieved the earliest/latest dates will persist
    //until the search criteria is changed.
    //This is potentially misleading so a potential future enhancement would be to see if
    //there was a different REST call available that covered the whole of the REST query...
    //notwithstanding the potential issue documented above about the variable number of records
    //returned from the query
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

  //having tracked the earliest/latest publication data, display it on the page
  var earliestDateField = document.getElementById("earliestDate");
  earliestDateField.textContent = earliestPublicationDate;
  var earliestBookField = document.getElementById("earliestBook");
  earliestBookField.textContent = earliestBook;
  var latestDateField = document.getElementById("latestDate");
  latestDateField.textContent = latestPublicationDate;
  var latestBookField = document.getElementById("latestBook");
  latestBookField.textContent = latestBook;

  //send the actual publication data to the next function for further processing
  displayDefaultTablePage(myDataArray);

  //track the author with the most number of books in this query
  trackMostCommonAuthor(authorsArray);
}

//display the publication list in the table on the page
function displayDefaultTablePage(data) {
  //unhide navigation buttons and set mouse hover behaviour
  prevButtonElement.style.visibility = "visible";
  prevButtonElement.addEventListener('mouseover', () => {
    prevButtonElement.style.backgroundColor = 'red';
  })
  prevButtonElement.addEventListener('mouseout', () => {
    prevButtonElement.style.backgroundColor = '';
  })
  nextButtonElement.style.visibility = "visible";
  nextButtonElement.addEventListener('mouseover', () => {
    nextButtonElement.style.backgroundColor = 'red';
  })
  nextButtonElement.addEventListener('mouseout', () => {
    nextButtonElement.style.backgroundColor = '';
  })
  let currentRecordStart = parseInt(table.dataset.recordStart);
  let currentRecordEnd = parseInt(table.dataset.recordEnd);
  //firstly create the table headers
  if (th == null) {
    let headerLabels = Object.keys(data[0]);
    for (let i = 0; i < headerLabels.length; i++) {
      th = document.createElement("th");
      th.textContent = headerLabels[i];
      theadRow.append(th);
    }
  }

  //add the data rows to the table and display them
  let recordsToDisplay = data.slice(currentRecordStart, currentRecordEnd + 1);
  createTbodyCells(recordsToDisplay);
  //hide the columns we don't want to display on the screen
  // NOTE - 
  // ID retained but not displayed just in case it was needed for future functions
  // DESCRIPTION is required in the event of a row click.  Design decision taken to 
  // store this at this point in order to reduce the need for WAN rountrips and reduce 
  // WAN latency in the execution of this app.
  hideColumns();
}

// determine scroll direction and initialize the page change
var waiting = false;
async function changePage(direction) {
  if (waiting) return;

  //store dataset info
  let currentRecordStart = parseInt(table.dataset.recordStart);
  let currentRecordEnd = parseInt(table.dataset.recordEnd);

  //if next clicked (scrolling down) then display the next set of records
  if (direction === "next") {
    if (currentRecordEnd + 1 > myDataArray.length) {
      return;
    }
    let newStart = currentRecordEnd + 1;
    let newEnd = newStart + paginationConfig.resultsPerPage - 1;

    table.dataset.recordStart = newStart;
    table.dataset.recordEnd = newEnd;

    //if you've hit the bottom of the previously retrieved dataset, go back to the API
    //to retrieve the next set of records
    if (newEnd > myDataArray.length) {
      startIndex += 41;
      waiting = true;
      queryBooksAPI();
      waiting = false;
      return;
    }
    let recordsToDisplay = myDataArray.slice(newStart, newEnd + 1);

    //display the new set of records
    createTbodyCells(recordsToDisplay);

    //if you've hit the top of the previously retrieved dataset, go back to the API
    //to retrieve the preceding set of records (if there are any)
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
}

// display the publication records on the page
function createTbodyCells(records) {
  //create displayed row containing book author(s) and title
  tbody.textContent = "";
  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    //let tr = document.createElement("tr");
    //let hasDesc = Object.hasOwnProperty.call(record, "description")

    let id = record["id"]
    let authors = record["authors"]
    let title = record["title"]
    let desc = record["description"]
    if (desc == "") {
      desc = "This title does not have a description"
    }

    let hiddenRowId = "hidden_row" + (record["id"])

    tbody.innerHTML += `
    <tr role="row" onclick="showHideRow('${hiddenRowId}');">
      <td>${id}</td>
      <td>${authors}</td>
      <td>${title}</td>
      <td>${desc}</td>
    </tr>
    `;
    tbody.innerHTML += `
      <tr role="row" id="${hiddenRowId}" class="hidden_row">
        <td colspan=4>
          ${desc}
        </td>
      </tr>  
      `;
  }
}

//hide the data columns we don't want to display on the screen
function hideColumns() {
  var rows = document.getElementById("bookTable").rows;

  for (var row = 0; row < rows.length; row++) {
    var cols = rows[row].cells;
    if (cols[0] && cols[3]) {
      cols[0].style.display = "none";
      cols[3].style.display = "none";
    }
  }
}

//function to display a pop-up to display the publication description
//DEVELOPER NOTE:
//this was my interpretation of how to implement the 'expand' functionality requested
//in the exercise
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

//function to track the author with the most titles in the returned data
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
  //display this author on the page
  mostCommonAuthorCountField.textContent = mf;
}

//add function to show or hide rows to allow expansion to show the title description...
function showHideRow(row) {
  $("#" + row).toggle();
}