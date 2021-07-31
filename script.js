const redditRegex = /^(http(?:s?):\/\/(?:www\.|old\.)?reddit.com\/r\/([a-zA-Z0-9_]{3,})*\/comments\/([a-zA-Z0-9]{6}))/g;

const getRedditJson = url => {
    return url + '.json';
}

const createTextPreview = (text, num = 200) => {
    if (text.length >= num) {
        return text.substring(0, num - 3) + '...';
    } else {
        return text;
    }
}

// Fetches the latest data about the post from the Reddit API.
const refreshData = () => {
    $('.resultsHolder').fadeIn(100);
    const proxy = 'https://crossrun.herokuapp.com/';
    const redditURL = window.redditURL;
    const url = proxy + getRedditJson(redditURL);
    $.get(getRedditJson(url), res => {
        // Only shows fetched data if the input's value's not empty and the URL is the same as before the fetch.
        if ($('#redditPostInput').val() !== '' && redditURL === window.redditURL) {
            $('.loading').hide();
            $('.resultsHolder').fadeIn(100);
            $('#postFlair').hide();
            $('#postImage').hide();
            $('#gallery').hide();
            $('#video').hide();
            $('#link').hide();
            $('#textContents').hide();
            $('.archivedIcon').hide();
            $('.lockedIcon').hide();
            $('.deletedIcon').hide();

            // Post Data
            const data = res[0].data.children[0].data;
            const title = data.title;
            $('#postTitle').text(title);
            $('#postTitle').attr('href', window.redditURL);
            const subreddit = data.subreddit;
            $('#postSubreddit').text(subreddit);
            $('#postSubreddit').attr('href', 'https://www.reddit.com/r/' + subreddit + '/');
            const postURL = data.url;
            const text = data.selftext;
            const isVideo = data.is_video;
            if (postURL.includes('gallery')) {
                // Gallery
                $('#gallery').attr('href', postURL);
                $('#gallery').show();
            } else if (text == '' && isVideo == false) {
                const hostname = new URL(postURL).hostname;
                if (hostname !== 'i.redd.it' && hostname !== 'external-preview.redd.it' && hostname !== 'i.imgur.com') {
                    // Link
                    $('#link').text(createTextPreview(postURL, 35));
                    $('#link').attr('href', postURL);
                    $('#link').show();
                } else {
                    // Image
                    $('#postImage').attr('alt', title);
                    $('#postImage').attr('src', postURL);
                    $('#postImage').show();
                }
            } else if (text != '') {
                // Text
                $('#textContents').text(createTextPreview(text));
                $('#textContents').show();
            } else if (isVideo == true) {
                // Video
                $('#video').attr('href', postURL);
                $('#video').show();
            }
            const user = data.author;
            $('#postUser').text(user);
            $('#postUserHolder').attr('href', 'https://www.reddit.com/u/' + user + '/');
            const score = data.ups;
            resetText('#postScore', score);
            const upvoteRatio = data.upvote_ratio;
            // Estimates the number of upvotes from the upvote ratio by adding the score to the estimated number of downvotes.
            const estUpvotes = ((score * (1 - upvoteRatio)) + score).toFixed();
            resetText('#postUpvotes', estUpvotes);
            // Estimates the number of downvotes by working out the percentage from the upvote ratio subtracted by one (the ratio for downvotes).
            const estDownvotes = (score * (1 - upvoteRatio)).toFixed();
            resetText('#postDownvotes', estDownvotes);
            const awards = data.total_awards_received;
            resetText('#postAwards', awards);
            const numComments = data.num_comments;
            resetText('#postComments', numComments);
            const archived = data.archived;
            if (archived) {
                $('.archviedIcon').show();
            }
            const locked = data.locked;
            if (locked) {
                $('.lockedIcon').show();
            }
            const deletedString = data.removed_by_category;
            if (deletedString === 'deleted') {
                $('.deletedIcon').show();
            }
            const flairText = data.link_flair_text;
            if (flairText !== null) {
                $('#postFlair').text(flairText);
                if (data.link_flair_background_color === '') {
                    $('#postFlair').css('background-color', '#d4d4d4');
                } else {
                    $('#postFlair').css('background-color', data.link_flair_background_color);
                }
                if (data.link_flair_text_color === 'light') {
                    $('#postFlair').css('color', '#f2f2f2');
                } else {
                    $('#postFlair').css('color', '#333333');
                }
                $('#postFlair').show();
            }
            const date = new Date();
            const currentTime = `${parseNumber(date.getHours())}:${parseNumber(date.getMinutes())}`;
            addData('Score', currentTime, score);
            addData('Estimated Upvotes', currentTime, estUpvotes);
            addData('Estimated Downvotes', currentTime, estDownvotes);
            addData('Awards', currentTime, awards);
            addData('Comments', currentTime, numComments);

            // Comment Data
            // const comments = res[1].data.children;

            $('.column').show();
        } else {
            $('.resultsHolder').hide();
        }
    });
}

const removeEmojis = str => {
    return str.split(':').pop();
}

// Adds a leading zero to a number if it only has one number
const parseNumber = num => {
    num = num.toString();
    if (num.length === 1) {
        return '0' + num;
    } else {
        return num;
    }
}

// Prevents all animations from happening at once when the visibility changes.
window.isVisible = true;

document.addEventListener('visibilitychange', () => {
    if (window.isVisible === true) {
        window.isVisible = false;
    } else {
        window.isVisible = true;
    }
});

// Creates an animation which either goes up or down depending on whether the value increases or decreases.
const resetText = (selector, newVal) => {
    // System to prevent all changes animating at once when you change back to page.
    const currentTime = new Date().getTime();
    if (currentTime - window.timeSinceLast[selector] < 4000) {
        window.timeSinceLast[selector] = currentTime;
        return;
    }
    window.timeSinceLast[selector] = currentTime;

    if (window.isVisible) {
        let isGreater;
        const oldVal = $(selector).text();
        isGreater = Number(oldVal) < Number(newVal);
        const isSmaller = Number(oldVal) > Number(newVal);
        const isSame = oldVal == newVal;
        if (oldVal == '') {
            isGreater = true;
        }
        if (isGreater) {
            $(selector).css('position', 'absolute');
            $(selector).animate(
                { marginTop: '-=2rem' }, {
                complete: () => {
                    $(selector).text(newVal);
                    $(selector).css('margin-top', '2.2rem');
                    $(selector).animate({ marginTop: '-=2rem' }, 500);
                    return;
                }
            });
        } else if (isSame) {
            $(selector).text(newVal);
            return;
        } else if (isSmaller) {
            $(selector).css('position', 'absolute');
            $(selector).animate(
                { marginTop: '+=2rem' }, {
                complete: () => {
                    $(selector).text(newVal);
                    $(selector).css('margin-top', '-1.8rem');
                    $(selector).animate({ marginTop: '+=2rem' }, 500);
                    return;
                }
            });
        }
    } else {
        $(selector).text(newVal);
        return;
    }
}

// Chart

const addData = (set, label, data) => {
    if (set === 'Score') {
        liveChart.data.labels.push(label);
    }

    liveChart.data.datasets.forEach((dataset) => {
        if (dataset.label === set) {
            dataset.data.push(data);   
        }
    });

    liveChart.update();
}

const clearChart = () => {
    liveChart.data.labels = [];

    liveChart.data.datasets.forEach((dataset) => {
        dataset.data = [];
    });

    liveChart.update();
}

var labels = [];

var data = {
    labels: labels,
    datasets: [{
        label: 'Score',
        backgroundColor: '#333333',
        borderColor: '#333333',
        lineTension: 0.6,
        data: [],
        hidden: false,
    }, {
        label: 'Estimated Upvotes',
        backgroundColor: '#d13c04',
        borderColor: '#d13c04',
        lineTension: 0.6,
        data: [],
        hidden: false,
    }, {
        label: 'Estimated Downvotes',
        backgroundColor: '#8d8eeb',
        borderColor: '#8d8eeb',
        lineTension: 0.6,
        data: [],
        hidden: true,
    }, {
        label: 'Awards',
        backgroundColor: '#46c92e',
        borderColor: '#46c92e',
        lineTension: 0.6,
        data: [],
        hidden: true,
    }, {
        label: 'Comments',
        backgroundColor: '#464545',
        borderColor: '#464545',
        lineTension: 0.6,
        data: [],
        hidden: true,
    }]
};

const config = {
    type: 'line',
    data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            point: {
                radius: 2.5,
            },
        },
    },
};

var liveChart = new Chart(
    document.getElementById('liveChart'), config
);

const exitFullscreenMode = () => {
    $('.exitFullscreenButton').hide();
    $('.column.shadow').removeAttr('id');
    $('.columnTitleHolder').removeClass('fullscreen');
    $('.canvasContainer').removeClass('fullscreen');
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

const enterFullscreenMode = () => {
    $('.exitFullscreenButton').show();
    $('.column.shadow').attr('id', 'fullscreen');
    $('.columnTitleHolder').addClass('fullscreen');
    $('.canvasContainer').addClass('fullscreen');
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    }
}

const getURLParameter = name => {
    return decodeURIComponent((new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)").exec(location.search) || [null, ""])[1].replace(/\+/g, "%20")) || null;
}

const startReloader = url => {
    $('.loading').show();
    clearChart();
    clearInterval(window.interval);
    window.timeSinceLast = {};
    window.postData = [];
    if (url !== '') {
        if (redditRegex.test(url)) {
            url = url.match(redditRegex)[0] + '/';
            window.redditURL = url;
            clearInterval(window.interval);
            refreshData();
        } else {
            $('.column').hide();
        }
        window.interval = setInterval(refreshData, 7000);
    } else {
        clearInterval(window.interval);
        $('.column').hide();
        $('.resultsHolder').hide();
    }
}

$(document).ready(() => {
    tippy('.archviedIcon', {
        content: 'Archived',
    });

    tippy('.lockedIcon', {
        content: 'Locked',
    });

    tippy('.deletedIcon', {
        content: 'Deleted',
    });

    tippy('#userIcon', {
        content: 'User',
    });

    tippy('#scoreIcon', {
        content: 'Score',
    });
    
    tippy('#estUpvotesIcon', {
        content: 'Estimated Upvotes',
    });

    tippy('#estDownvotesIcon', {
        content: 'Estimated Downvotes',
    });

    tippy('#awardsIcon', {
        content: 'Awards',
    });

    tippy('#commentsIcon', {
        content: 'Comments',
    });

    tippy('#postFlair', {
        content: 'Flair',
    });

    tippy('.subredditHolder', {
        content: 'Subreddit',
    });

    tippy('.enterFullscreenButton', {
        content: 'Fullscreen',
    });

    tippy('.exitFullscreenButton', {
        content: 'Exit Fullscreen',
    });
});