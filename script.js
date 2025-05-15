// At the very top of the script
const LOCAL_STORAGE_KEY_LINKS = 'interactiveLinkManagerData'; // Renamed for clarity
const LOCAL_STORAGE_KEY_SORT = 'interactiveLinkManagerSortCriteria'; // For sort preference
let links = [];
let currentSortCriteria = 'dateAdded_desc'; // Default sort order

// DOM element variables
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;
let sortCriteriaSelect; // For the sort dropdown

// --- Local Storage Functions ---
function saveLinksToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_LINKS, JSON.stringify(links));
    } catch (e) {
        console.error("Could not save links to Local Storage:", e);
    }
}

function saveSortCriteriaToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SORT, currentSortCriteria);
    } catch (e) {
        console.error("Could not save sort criteria to Local Storage:", e);
    }
}

function getDefaultLinks() {
    const now = Date.now();
    // Ensure default links also have a dateAdded timestamp
    return [
        { text: "Google Search (Default)", url: "https://www.google.com", scheduledTime: "Tomorrow AM", dateAdded: now - 200000 },
        { text: "Wikipedia (Default)", url: "https://www.wikipedia.org", dateAdded: now - 100000 },
        { text: "Developer Mozilla (Default)", url: "https://developer.mozilla.org", dateAdded: now }
    ];
}

function loadLinksFromLocalStorage() {
    console.log("Attempting to load links from Local Storage. Key:", LOCAL_STORAGE_KEY_LINKS);
    try {
        const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY_LINKS);
        if (storedLinks) {
            let parsedLinks = JSON.parse(storedLinks);
            if (Array.isArray(parsedLinks)) {
                // Ensure all links have a dateAdded property for consistent sorting
                // Older links (before this feature) will get a '0' timestamp, making them oldest.
                parsedLinks = parsedLinks.map(link => ({
                    ...link,
                    dateAdded: link.dateAdded === undefined ? 0 : link.dateAdded
                }));
                console.log("Parsed links from Local Storage:", parsedLinks);
                return parsedLinks;
            } else {
                console.warn("Stored links data is not an array. Falling back to defaults.");
            }
        } else {
            console.log("No links data found in Local Storage. Falling back to defaults.");
        }
    } catch (e) {
        console.error("Error parsing links from Local Storage:", e, "Falling back to defaults.");
    }
    return getDefaultLinks();
}

function loadSortCriteriaFromLocalStorage() {
    const storedSortCriteria = localStorage.getItem(LOCAL_STORAGE_KEY_SORT);
    if (storedSortCriteria) {
        console.log("Loaded sort criteria from Local Storage:", storedSortCriteria);
        return storedSortCriteria;
    }
    console.log("No sort criteria in Local Storage, using default:", currentSortCriteria);
    return currentSortCriteria; // Default if nothing is stored
}


// --- Sorting Function ---
function sortLinks() {
    console.log("Sorting links by:", currentSortCriteria);
    links.sort((a, b) => {
        switch (currentSortCriteria) {
            case 'dateAdded_desc': // Newest first
                return (b.dateAdded || 0) - (a.dateAdded || 0);
            case 'dateAdded_asc': // Oldest first
                return (a.dateAdded || 0) - (b.dateAdded || 0);
            case 'text_asc':
                return a.text.localeCompare(b.text);
            case 'text_desc':
                return b.text.localeCompare(a.text);
            case 'scheduledTime_asc':
                // Links with no scheduledTime go last
                if (!a.scheduledTime && b.scheduledTime) return 1;
                if (a.scheduledTime && !b.scheduledTime) return -1;
                if (!a.scheduledTime && !b.scheduledTime) return 0; // Both have no time, or both have time (equal for this check)
                return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
            case 'scheduledTime_desc':
                if (!a.scheduledTime && b.scheduledTime) return 1;
                if (a.scheduledTime && !b.scheduledTime) return -1;
                if (!a.scheduledTime && !b.scheduledTime) return 0;
                return (b.scheduledTime || "").localeCompare(a.scheduledTime || "");
            default:
                return 0;
        }
    });
    saveSortCriteriaToLocalStorage(); // Save the current sort preference
}

// --- Helper function to log messages to the page (no changes) ---
function logToPage(message) {
    const now = new Date();
    const timestamp = now.toLocaleString();
    const logEntry = document.createElement('p');
    logEntry.classList.add('log-entry');
    logEntry.textContent = `[${timestamp}] ${message}`;
    if (clickLogElement && clickLogElement.firstChild) {
        clickLogElement.insertBefore(logEntry, clickLogElement.firstChild);
    } else if (clickLogElement) {
        clickLogElement.appendChild(logEntry);
    }
}

// --- Function to handle link removal (no changes other than saveLinksToLocalStorage is already there) ---
function handleRemoveLink(linkToRemove) {
    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"? This cannot be undone.`)) {
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1);
            saveLinksToLocalStorage();
            // Re-sort and render if needed, or just render if sort order doesn't change by removal
            // sortLinks(); // Not strictly necessary unless removal changes sort relevance
            renderLinks();
            logToPage(`Link "${linkToRemove.text}" removed.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" in the array to remove.`);
        }
    }
}

// --- Function to handle link clicks (no changes other than saveLinksToLocalStorage is already there) ---
function handleLinkClick(event, linkObject) {
    event.preventDefault();
    const url = linkObject.url;
    const linkText = linkObject.text;
    let activityMessage = `Clicked "${linkText}" (${url}).`;
    let linksModified = false;

    if (confirm(`You clicked on "${linkText}".\nDo you want to visit ${url} now?`)) {
        activityMessage += ` User chose to visit immediately. Navigating...`;
        logToPage(activityMessage);
        window.location.href = url;
    } else {
        activityMessage += ` User chose NOT to visit immediately.`;
        const visitLaterTimeInput = prompt(
            `Set/update a reminder time for "${linkText}":\n(Leave blank to clear)`,
            linkObject.scheduledTime || ""
        );

        if (visitLaterTimeInput && visitLaterTimeInput.trim() !== "") {
            const visitLaterTime = visitLaterTimeInput.trim();
            if (linkObject.scheduledTime !== visitLaterTime) {
                linkObject.scheduledTime = visitLaterTime;
                linksModified = true;
            }
            activityMessage += ` Reminder set/updated to: ${visitLaterTime}.`;
        } else if (visitLaterTimeInput === "") {
            if (linkObject.scheduledTime) {
                delete linkObject.scheduledTime;
                linksModified = true;
            }
            activityMessage += ` Reminder cleared.`;
        } else {
            activityMessage += ` User declined to set/update a reminder.`;
        }

        if (linksModified) {
            saveLinksToLocalStorage();
        }
        logToPage(activityMessage);
        sortLinks(); // Re-sort if scheduled time changed, as it affects sorting
        renderLinks();
    }
}

// --- Function to render the links on the page (no functional change) ---
function renderLinks() {
    if (!linkListElement) return;
    linkListElement.innerHTML = '';

    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links have been added yet. Click "Add New Link" below!';
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi);
        return;
    }

    links.forEach(linkObj => { // Assumes links array is already sorted
        const listItem = document.createElement('li');
        const linkTextContainer = document.createElement('div');
        linkTextContainer.className = 'link-text-container';
        const anchorTag = document.createElement('a');
        anchorTag.href = linkObj.url;
        anchorTag.textContent = linkObj.text;
        anchorTag.title = `Visit ${linkObj.text}`;
        anchorTag.addEventListener('click', (event) => handleLinkClick(event, linkObj));
        linkTextContainer.appendChild(anchorTag);
        listItem.appendChild(linkTextContainer);

        if (linkObj.scheduledTime) {
            const scheduleDisplay = document.createElement('span');
            scheduleDisplay.className = 'scheduled-time';
            scheduleDisplay.textContent = `Visit: ${linkObj.scheduledTime}`;
            listItem.appendChild(scheduleDisplay);
        }

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-btn';
        removeButton.title = `Remove link: ${linkObj.text}`;
        removeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            handleRemoveLink(linkObj);
        });
        listItem.appendChild(removeButton);
        linkListElement.appendChild(listItem);
    });
}

// --- Event listener for "Add New Link" button ---
function setupAddLinkButtonListener() {
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            const newLinkText = prompt("Enter the text/name for the new link:");
            if (newLinkText === null) return;
            if (newLinkText.trim() === "") {
                alert("Link text cannot be empty. Link not added.");
                return;
            }

            const newLinkUrl = prompt("Enter the full URL for the new link (e.g., https://www.example.com):");
            if (newLinkUrl === null) return;
            if (newLinkUrl.trim() === "") {
                alert("Link URL cannot be empty. Link not added.");
                return;
            }

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`The URL doesn't start with http:// or https://. Should we add "https://"?\n\n(Your URL: ${cleanUrl})`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else {
                    alert("Invalid URL format. Link not added. Please include http:// or https://.");
                    return;
                }
            }

            const newLink = {
                text: newLinkText.trim(),
                url: cleanUrl,
                dateAdded: Date.now() // Add timestamp when link is created
            };
            links.push(newLink);
            saveLinksToLocalStorage();
            sortLinks(); // Sort after adding, then render
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
        });
    }
}

// --- Initial setup when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

    links = loadLinksFromLocalStorage();
    currentSortCriteria = loadSortCriteriaFromLocalStorage(); // Load preferred sort order

    if (sortCriteriaSelect) {
        sortCriteriaSelect.value = currentSortCriteria; // Set dropdown to match loaded/default criteria
        sortCriteriaSelect.addEventListener('change', (event) => {
            currentSortCriteria = event.target.value;
            sortLinks(); // Sort with new criteria
            renderLinks(); // Re-render the sorted list
        });
    }

    sortLinks(); // Initial sort based on loaded/default criteria
    renderLinks();
    setupAddLinkButtonListener();
    logToPage("Link manager initialized. Data and sort preference loaded. Current time: " + new Date().toLocaleTimeString());
});
