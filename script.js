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
        const dataToSave = JSON.stringify(links);
        console.log("Attempting to save to Local Storage. Data:", dataToSave); // LOG: What's being saved
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
        console.log("Data successfully saved to Local Storage under key:", LOCAL_STORAGE_KEY); // LOG: Confirmation
    } catch (e) {
        console.error("Could not save links to Local Storage:", e);
    }
}

function getDefaultLinks() {
    console.log("Using default links."); // LOG: When defaults are used
    return [
        { text: "Google Search (Default)", url: "https://www.google.com", scheduledTime: "Tomorrow AM" },
        { text: "Wikipedia (Default)", url: "https://www.wikipedia.org" },
    ];
}

function loadLinksFromLocalStorage() {
    console.log("Attempting to load links from Local Storage. Key:", LOCAL_STORAGE_KEY); // LOG: Start load
    try {
        const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log("Raw data from Local Storage:", storedLinks); // LOG: What was retrieved
        if (storedLinks) {
            const parsedLinks = JSON.parse(storedLinks);
            console.log("Parsed links from Local Storage:", parsedLinks); // LOG: Parsed data
            if (Array.isArray(parsedLinks)) {
                return parsedLinks;
            } else {
                console.warn("Stored data is not an array. Falling back to defaults.");
                return getDefaultLinks();
            }
        } else {
            console.log("No data found in Local Storage. Falling back to defaults.");
        }
    } catch (e) {
        console.error("Error parsing links from Local Storage:", e, "Falling back to defaults.");
    }
    return getDefaultLinks();
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
        console.log("handleRemoveLink: Attempting to remove:", JSON.parse(JSON.stringify(linkToRemove))); // LOG: What we want to remove
        console.log("handleRemoveLink: Current 'links' array before removal:", JSON.parse(JSON.stringify(links))); // LOG: State before

        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        console.log("handleRemoveLink: Found index for removal:", index); // LOG: Index found

        if (index > -1) {
            links.splice(index, 1);
            console.log("handleRemoveLink: 'links' array after splice:", JSON.parse(JSON.stringify(links))); // LOG: State after splice
            saveLinksToLocalStorage(); // Attempt to save the modified array
            renderLinks();
            logToPage(`Link "${linkToRemove.text}" removed.`);
            console.log(`Link "${linkToRemove.text}" removed from JS array and save attempted.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" in the array to remove.`);
            console.error(`Error: Could not find link "${linkToRemove.text}" in the array to remove. Current links:`, JSON.parse(JSON.stringify(links)));
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
                console.log("handleLinkClick: Scheduled time updated for", linkObject.text, "to", visitLaterTime); // LOG
            }
            activityMessage += ` Reminder set/updated to: ${visitLaterTime}.`;
        } else if (visitLaterTimeInput === "") {
            if (linkObject.scheduledTime) {
                delete linkObject.scheduledTime;
                linksModified = true;
                console.log("handleLinkClick: Scheduled time cleared for", linkObject.text); // LOG
            }
            activityMessage += ` Reminder cleared.`;
        } else {
            activityMessage += ` User declined to set/update a reminder.`;
        }

        if (linksModified) {
            console.log("handleLinkClick: Links modified, calling saveLinksToLocalStorage."); // LOG
            saveLinksToLocalStorage();
        }
        logToPage(activityMessage);
        renderLinks();
    }
}

// --- Function to render the links on the page ---
function renderLinks() {
    if (!linkListElement) {
        console.error("renderLinks: linkListElement is not defined!"); // LOG: Error check
        return;
    }
    console.log("renderLinks: Rendering links. Current 'links' array:", JSON.parse(JSON.stringify(links))); // LOG: State at render time

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
            // ... (prompt logic as before)
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
            console.log("setupAddLinkButtonListener: New link pushed. Calling saveLinksToLocalStorage."); // LOG
            saveLinksToLocalStorage();
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
            console.log(`New link "${newLink.text}" (${newLink.url}) added.`);
        });
    } else {
        console.error("setupAddLinkButtonListener: showAddLinkDialogBtn not found!"); // LOG: Error check
    }
}


// --- Initial setup when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Event fired."); // LOG: DOM Ready

    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');

    console.log("DOMContentLoaded: DOM elements selected."); // LOG: Elements selected

    links = loadLinksFromLocalStorage(); // Load links

    renderLinks();
    setupAddLinkButtonListener();
    logToPage("Link manager initialized. Data loaded. Current time: " + new Date().toLocaleTimeString());
    console.log("DOMContentLoaded: Initialization complete. Initial links array:", JSON.parse(JSON.stringify(links))); // LOG: Final initial state
});
