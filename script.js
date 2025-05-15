// At the very top of the script
const LOCAL_STORAGE_KEY = 'interactiveLinkManagerData';
let links = []; // Initialize as an empty array; will be populated from Local Storage or defaults

// DOM element variables - will be assigned in DOMContentLoaded
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;

// --- Local Storage Functions ---
function saveLinksToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(links));
        // console.log("Links saved to Local Storage."); // Optional: for debugging
    } catch (e) {
        console.error("Could not save links to Local Storage:", e);
        // Potentially alert the user if storage is full or disabled
    }
}

function getDefaultLinks() {
    // This is the initial default if nothing is in local storage or loading fails
    return [
        { text: "Google Search", url: "https://www.google.com", scheduledTime: "Tomorrow AM" },
        { text: "Wikipedia Encyclopedia", url: "https://www.wikipedia.org" },
        { text: "Example Domain Info", url: "https://www.example.com" },
        { text: "Developer Mozilla", url: "https://developer.mozilla.org" }
    ];
}

function loadLinksFromLocalStorage() {
    try {
        const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedLinks) {
            const parsedLinks = JSON.parse(storedLinks);
            // Basic validation to ensure it's an array (could be more thorough)
            return Array.isArray(parsedLinks) ? parsedLinks : getDefaultLinks();
        }
    } catch (e) {
        console.error("Error parsing links from Local Storage:", e);
        // Fallback to default links if parsing fails (e.g., corrupted data)
    }
    return getDefaultLinks(); // Return default if nothing stored or if there was an error
}


// --- Helper function to log messages to the page ---
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

// --- Function to handle link removal ---
function handleRemoveLink(linkToRemove) {
    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"? This cannot be undone.`)) {
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1);
            saveLinksToLocalStorage(); // <-- SAVE AFTER MODIFICATION
            renderLinks();
            logToPage(`Link "${linkToRemove.text}" removed.`);
            console.log(`Link "${linkToRemove.text}" removed.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" to remove.`);
            console.error(`Error: Could not find link "${linkToRemove.text}" to remove.`);
        }
    }
}

// --- Function to handle link clicks (for visiting or scheduling) ---
function handleLinkClick(event, linkObject) {
    event.preventDefault();

    const url = linkObject.url;
    const linkText = linkObject.text;
    let activityMessage = `Clicked "${linkText}" (${url}).`;
    let linksModified = false;

    console.log(`User clicked on "${linkText}".`);

    if (confirm(`You clicked on "${linkText}".\nDo you want to visit ${url} now?`)) {
        activityMessage += ` User chose to visit immediately. Navigating...`;
        logToPage(activityMessage);
        console.log(`User chose to visit "${linkText}" immediately.`);
        window.location.href = url;
    } else {
        activityMessage += ` User chose NOT to visit immediately.`;
        console.log(`User chose not to visit "${linkText}" immediately.`);

        const visitLaterTimeInput = prompt(
            `You chose not to visit "${linkText}" now.\nWould you like to set/update a reminder time for this link?\n(Leave blank to clear existing reminder)`,
            linkObject.scheduledTime || ""
        );

        if (visitLaterTimeInput && visitLaterTimeInput.trim() !== "") {
            const visitLaterTime = visitLaterTimeInput.trim();
            if (linkObject.scheduledTime !== visitLaterTime) {
                linkObject.scheduledTime = visitLaterTime;
                linksModified = true;
            }
            activityMessage += ` Reminder set/updated to: ${visitLaterTime}.`;
        } else if (visitLaterTimeInput === "") { // User explicitly cleared the input
            if (linkObject.scheduledTime) { // Only modify if there was a time before
                delete linkObject.scheduledTime;
                linksModified = true;
            }
            activityMessage += ` Reminder cleared.`;
        } else { // User pressed cancel (prompt returns null)
            activityMessage += ` User declined to set/update a reminder.`;
        }

        if (linksModified) {
            saveLinksToLocalStorage(); // <-- SAVE AFTER MODIFICATION
        }
        logToPage(activityMessage);
        renderLinks();
    }
}

// --- Function to render the links on the page ---
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

    links.forEach(linkObj => {
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

            const newLink = { text: newLinkText.trim(), url: cleanUrl };
            links.push(newLink);
            saveLinksToLocalStorage(); // <-- SAVE AFTER MODIFICATION
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
            console.log(`New link "${newLink.text}" (${newLink.url}) added.`);
        });
    }
}


// --- Initial setup when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element variables now that the DOM is ready
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');

    links = loadLinksFromLocalStorage(); // <-- LOAD LINKS FROM LOCAL STORAGE

    renderLinks(); // Display initial links (now from localStorage or default)
    setupAddLinkButtonListener(); // Setup listener for the add button
    logToPage("Link manager initialized. Data loaded from Local Storage (if available). Current time: " + new Date().toLocaleTimeString());
});
