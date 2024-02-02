// TODO: Timeline zoom control
// TODO: Timeline filter?
window.onload = PageLoaded;
update_events = [];  // What things are subscribed to the update loop.

calendar_elem = null;
text_area_elem = null;
top_fade_elem = null;

start_date = [2015, 10, 1];
end_date = [2024, 1, 30];

calendar_length_of_day = 1920 / (6 * 30);
column_separation = 25;
column_top_offset = 60;
calendar_circle_radius = 20/2;
calendar_scroll = 0;
calendar_text_left_offset = 15;

writeup_pixels_per_day = 1080 / (3 * 30);

timeline_events = [];
month_names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function PageLoaded() {
    // References
    calendar_elem = document.getElementById("calendar");
    text_area_elem = document.getElementById("text_content");
    top_fade_elem = document.getElementById("top_fade");

    RequestTimeline();
}

function RequestTimeline() {
    var search_endpoint = document.location.origin + "/static/project_timeline/timeline.json";
    var search_request = new URL(search_endpoint);

    var xhr = new XMLHttpRequest();
    xhr.open("GET", search_request, true);
//    xhr.responseType = "json";
    //xhr.onerror = function(e) {SearchRequestError(e)};
    xhr.onload = function() {
        GenerateTimeline(JSON.parse(xhr.responseText))
        setInterval(UpdateLoop, 10);
    };
    xhr.send(null);
}

function GenerateTimeline(timeline_json) {
    timeline_events = [];
    for (let i = 0; i < timeline_json.events.length; i++) {
        timeline_events.push(InitTimelineEvent(timeline_json.events[i]));
    }

    CreateCalendar(timeline_events);
    for (let i = 0; i < timeline_events.length; i++) {
        text_area_elem.appendChild(timeline_events[i].writeup_elem);
    }
}

function CreateCalendar(events) {
    var columns = [];
    for (let i = 0; i < timeline_events.length; i++) {
        let event = timeline_events[i];
        // First available column
        var i_column = 0;
        for (; i_column < columns.length; i_column++) {
            if (DoesCellFitInColumn(columns[i_column], event))
                break;
        }
        // New column
        if (i_column == columns.length)
            columns[i_column] = [];

        columns[i_column].push(event);
    }
    cal_height = column_top_offset + (columns.length) * column_separation;
    top_fade_elem.style.height = `${cal_height}px`

    var columns_elem = HtmlToElement(`<div id="columns"></div>`);
    for (let i = 0; i < columns.length; i++) {
        columns_elem.appendChild(GenerateColumn(i, columns[i]));
    }
    calendar_elem.appendChild(columns_elem);

    // Dates/ticks
    var t_html = "";
    var y = start_date[0];
    var m = start_date[1];
    var reached_end = false;
    for (; y <= end_date[0]; y++) {
        for (; m <= 12; m++) {
            let month_name = month_names[m-1];
            let pos = DateToDays(start_date, [y, m, 1]) * calendar_length_of_day;
            if (m != 1) {
                t_html += `<div class="calendar_tick calendar_small_tick" style="left: ${pos}px;"></div>`
                t_html += `<p class="calendar_date" style="left: ${pos}px;">${month_name}</p>`
            }
            else {
                t_html += `<div class="calendar_tick calendar_big_tick" style="left: ${pos}px;"></div>`
                t_html += `<p class="calendar_date" style="left: ${pos}px; font-weight: bold;">${y}</p>`
            }
            if (y == end_date[0] && m > end_date) {
                reached_end = true;
                break;
            }
        }
        m = 1;
    }
    calendar_elem.appendChild(HtmlToElement(`<div id="ticks">${t_html}</div>`));
}

// When I tried to do this only once on generation, it wasn't properly accounting for the formatting of images, and would give wildly incorrect results. Therefore, I'm simply regularly updating it instead.
function UpdateWriteups() {
    var writeups_size = 0;
    for (let i = 0; i < timeline_events.length; i++) {
        let e = timeline_events[i];
        let pos = writeups_size + (e.start * writeup_pixels_per_day);

        e.writeup_elem.style.top = `${pos}px`;
        writeups_size += e.writeup_elem.clientHeight;
    }
}

function CreateWriteupText(title, content, date_arr, tag, github, finished) {
    var tag_color = `tag_color_${tag}`;
    var date = DateToString(date_arr);
    var gh = "";
    if (github != "")
        gh = ` | <a href="${github}">GitHub</a>`;

    var status = "";
    switch (finished) {
        case -1:
            break;
        case 0:
            status = ` | <span class="status_unfinished">Unfinished</span>`;
            break;
        case 1:
            status = ` | <span class="status_finished">Finished</span>`;
            break;
        case 2:
            status = ` | <span class="status_maintained">Maintained</span>`;
            break;
    }
    return `
    <div class="writeup">
    <h1 class="${tag_color}">${title}</h1>
    <p class="subtitle_date">${date}${gh}${status}</p>
    ${content}
    </div>`
}

function DateToDays(start_date_arr, date_arr) {
    start_date_arr[2] = start_date_arr[2] > 30 ? 30 : start_date_arr[2];  // min function
    date_arr[2] = date_arr[2] > 30 ? 30 : date_arr[2];  // min function

    var years = date_arr[0] - start_date_arr[0];
    var months = date_arr[1] - start_date_arr[1];
    var days = date_arr[2] - start_date_arr[2];

    return days + months * 30 + years * 12 * 30;
}

function DateToString(date_arr) {
    var y = date_arr[0];

    var month_names_full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var m = month_names_full[date_arr[1] - 1];

    var d = date_arr[2].toString();
    var d1 = d.slice(0, -1);
    var d2 = d.slice(-1);
    switch(d2) {
        case "1":
            d2 = "1st";
            break;
        case "2":
            d2 = "2nd";
            break;
        case "3":
            d2 = "3rd";
            break;
        default:
            d2 = `${d2}th`;
    }
    d = d1 + d2;
    return `${y}, ${m} ${d}`;
}

/*
Whether the given cell would overlap any other cell in given column.
Returns: bool
*/
function DoesCellFitInColumn(column, cell) {
    for (let i = 0; i < column.length; i++) {
        let other_cell = column[i];

        var end_pos = cell.calendar_text_left + cell.calendar_text_width;
        var x1 = cell.start * calendar_length_of_day;
        var x2 = Math.max(cell.end * calendar_length_of_day, end_pos);

        end_pos = other_cell.calendar_text_left + other_cell.calendar_text_width + calendar_circle_radius;
        var y1 = other_cell.start * calendar_length_of_day;
        var y2 = Math.max(other_cell.end * calendar_length_of_day, end_pos);

        if (RangeOverlap(x1, x2, y1, y2)) {
            return false;
        }
    }

    return true;
}

/* Returns: html string */
function GenerateNode(location, tag) {
    var tag_color = `tag_color_${tag}`;
    location = location * calendar_length_of_day;
    return `
    <div class="calendar_circle ${tag_color}" style="left:${location}px;"></div>
    `;
}

/* Returns: html string */
function GenerateBar(start, end, tag) {
    start *= calendar_length_of_day;
    end *= calendar_length_of_day;
    var length = (end - start);
    var tag_color = `tag_color_${tag}`;
    // Return of the ugly element generation! Viva la zteam!
    var template = `
    <div class="calendar_bar ${tag_color}" style="left: ${start}px; width: ${length}px;"></div>
    `;
    return template;
}

/* Returns: html string */
function GenerateCalendarText(position, text) {
    position = position * calendar_length_of_day + calendar_text_left_offset;
    return `<span class="calendar_text" style="left:${position}px;">${text}</span>`;
}

/* Returns: html string */
function GenerateColumn(index, cells) {
    var left = column_top_offset + index * column_separation;
    var column = HtmlToElement(`<div class="calendar_column" style="top: ${left}px;"></div>`);
    for (let i = 0; i < cells.length; i++) {
        column.appendChild(cells[i].calendar_elem);
    }
    return column;
}

//delay_timer = 000;
function UpdateLoop(){
    UpdateCalendarScroll();
    StickCalendarTitles();
    UpdateWriteups();

    for (let i = 0; i < update_events.length; i++){
        update_events[i]();
    }
}

function UpdateCalendarScroll() {
    var writeup_scroll_pos = document.documentElement.scrollTop + (window.screen.height / 2);
    calendar_scroll = window.screen.width * 0.5;

    // Make the position hold when we're going past a writeup.
    var writeups_passed_size = 0;
    for (let i = 0; i < timeline_events.length; i++) {
        var e = timeline_events[i];
        var w_size = e.writeup_elem.clientHeight;
        var w_top = e.writeup_elem.style.top;
        w_top = parseInt(w_top.substring(0, w_top.length - 2));
        var w_bottom = w_top + w_size;

        if (writeup_scroll_pos < w_top)
            break;
        if (writeup_scroll_pos > w_bottom) {
            writeups_passed_size += w_size;
            continue;
        }
        writeups_passed_size += (writeup_scroll_pos - w_top);
    }

    // For some reason this reads NaN on frame 1. Probably some stupid return value somewhere.
    if (isNaN(writeups_passed_size))
        writeups_passed_size = 0;

    var writeup_scroll_days = (writeup_scroll_pos - writeups_passed_size) / writeup_pixels_per_day;
    calendar_scroll += -writeup_scroll_days * calendar_length_of_day;

    calendar_elem.style.left = `${calendar_scroll}px`;
}

function StickCalendarTitles() {
    // Keep the title of projects on screen while they're still being worked on.
    var sticky_scroll_pos = window.screen.width / 2;
    for (let i = 0; i < timeline_events.length; i++) {
        var e = timeline_events[i];

        var e_stick_point = sticky_scroll_pos - calendar_scroll - (e.calendar_text_width / 2);
        // If the bar is shorter than the text this can be smaller than min.
        // Min is more important here as it's the natural position, so we apply this first.
        var bar_right = (e.start + e.end - e.start) * calendar_length_of_day - e.calendar_text_width;
        e_stick_point = Math.min(bar_right, e_stick_point);

        var min = e.calendar_text_left;
        e_stick_point = Math.max(min, e_stick_point);

        e.calendar_text_elem.style.left = `${e_stick_point}px`;
    }
}

// === Generic Functions === //
function RangeOverlap(x1, x2, y1, y2) {
    return Math.max(x1, y1) <= Math.min(x2, y2);
}

function HtmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function GetHeight(element, original_parent) {
    element.style.visibility = "hidden";
    document.body.appendChild(element);
    var height = element.offsetHeight + 0;
    document.body.removeChild(element);
    element.style.visibility = "visible";
    original_parent.appendChild(element);
    return height;
}

function GetWidth(element, original_parent) {
    element.style.visibility = "hidden";
    document.body.appendChild(element);
    var height = element.offsetWidth + 0;
    document.body.removeChild(element);
    element.style.visibility = "visible";
    original_parent.appendChild(element);
    return height;
}

// === Objects === //
function InitTimelineEvent(e) {
    var start = DateToDays(start_date, e.start)
    var end = 0;
    if (e.end.length == 0)
        end = start;
    else if (e.end[0] == -1)
        end = DateToDays(start_date, end_date);
    else
        end = DateToDays(start_date, e.end);

    var calendar_html = "<div>";
    if (end != -1)
        calendar_html += GenerateBar(start, end, e.tag);
    calendar_html += GenerateNode(start, e.tag);
    calendar_html += GenerateCalendarText(start, e.title);
    calendar_html += "</div>";
    var calendar = HtmlToElement(calendar_html);
    var calendar_text_width = GetWidth(calendar.getElementsByTagName("span")[0], calendar);

    return {
        "start": start,
        "end": end,
        "tag": e.tag,

        "calendar_elem": calendar,
        "writeup_elem": HtmlToElement(CreateWriteupText(e.title, e.content, e.start, e.tag, e.github, e.finished)),

        "calendar_text_elem": calendar.getElementsByTagName("span")[0],
        "calendar_text_width": calendar_text_width,
        "calendar_text_left": start * calendar_length_of_day + calendar_text_left_offset,
    };
}