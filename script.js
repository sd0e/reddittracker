const redditRegex = /^(http(?:s?):\/\/(?:www\.|old\.)?reddit.com\/(?:r|u|user)\/([a-zA-Z0-9_-]{3,})*\/comments\/([a-zA-Z0-9]{6}))/g;
const linkRegex = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g;

window['lastTime'] = null;

const proxy = 'https://crossrun.onrender.com/';

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

// Pings the proxy to turn it on, decreasing response time once the user enters a valid URL
const pingProxy = () => $.get(proxy);

pingProxy();

// Gets the comment with the most upvotes from an array of comments
const getTopCommentIndex = arr => {
    window.tempIndex = 0;
    window.topVal = '';
    window.exists = false;
    for (let idx = 0; idx < arr.length; idx++) {
        if (arr[idx].kind === 't1') {
            window.exists = true;
            const data = arr[idx].data;
            if (data.ups > window.topVal || window.topVal === '') {
                window.topVal = data.ups;
                window.tempIndex = idx;
            }
        }
    }
    if (window.exists) {
        return window.tempIndex;
    } else {
        return -1;
    }
}

// Fetches the latest data about the post from the Reddit API.
const refreshData = () => {
    $('.resultsHolder').fadeIn(100);
    const redditURL = window.redditURL;
    const url = proxy + getRedditJson(redditURL);
    $.get(getRedditJson(url), res => {
        // Only shows fetched data if the input's value's not empty and the URL is the same as before the fetch.
        if ($('#redditPostInput').val() !== '' && redditURL === window.redditURL) {
            $('.loading').hide();
            $('.resultsHolder').fadeIn(100);
            $('#postFlair').hide();
            $('#postImage').hide();
            $('#postImage').css('margin-bottom', '0');
            $('#gallery').hide();
            $('#video').hide();
            $('#link').hide();
            $('#textContents').hide();
            $('.archivedIcon').hide();
            $('.lockedIcon').hide();
            $('.deletedIcon').hide();
            $('.removedIcon').hide();
            $('.adIcon').hide();
            $('.commentHolder').hide();
            $('#noComments').hide();
            $('#noComments').text('This post has no comments.');

            // Post Data
            const data = res[0].data.children[0].data;
            const title = data.title;
            $('#postTitle').text(title);
            $('#postTitle').attr('href', window.redditURL);
            tippy('#postTitle', {
                content: 'Click to view post on Reddit',
            });
            const subreddit = data.subreddit;
            if (!subreddit.startsWith('u_')) {
                // Subreddit
                $('#postTypePrefix').text('r/');
                $('#postSubreddit').text(subreddit);
                $('#postSubreddit').attr('href', 'https://www.reddit.com/r/' + subreddit + '/');
            } else {
                // User
                $('#postTypePrefix').text('u/');
                $('#postSubreddit').text(subreddit.slice(2));
                $('#postSubreddit').attr('href', 'https://www.reddit.com/u/' + subreddit.slice(2) + '/');
            }
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
                    tippy('#postImage', {
                        content: title,
                    });
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
            tippy('#postUser', {
                content: user,
            });
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
            const upvotePercentage = data.upvote_ratio * 100;
            resetText('#postUpvotePercentage', upvotePercentage);
            // (upvotes s^{-1})
            const derivative = window['lastTime'] !== null && window['lastTime'] !== undefined ? ((score - window['lastScore'])/((new Date().getTime() - window['lastTime'])/1000)) : null;
            const archived = data.archived;
            if (archived) {
                $('.archviedIcon').show();
            }
            const locked = data.locked;
            if (locked) {
                $('.lockedIcon').show();
                $('#noComments').text("This post is locked. There are currently no comments, and it's unlikely there will be any.");
            }
            const removedString = data.removed_by_category;
            if (removedString === 'deleted') {
                // User deleted
                $('.deletedIcon').show();
            } else if (removedString === 'moderator') {
                // Moderator removed
                $('.removedIcon').show();
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

            if (data.mobile_ad_url !== undefined) {
                // Is an advertisement.
                if (data.mobile_ad_url !== '') {
                    // Has an image
                    const adImageURL = data.mobile_ad_url;
                    $('#postImage').attr('alt', title);
                    $('#postImage').attr('src', adImageURL);
                    $('#postImage').css('margin-bottom', '1rem');
                    $('#postImage').show();
                    tippy('#postImage', {
                        content: title,
                    });
                }
                $('.adIcon').show();
            }

            const date = new Date();
            const currentTime = `${parseNumber(date.getHours())}:${parseNumber(date.getMinutes())}`;
            addData('Score', currentTime, score);
            addData('Estimated Upvotes', currentTime, estUpvotes);
            addData('Estimated Downvotes', currentTime, estDownvotes);
            addData('Awards', currentTime, awards);
            addData('Comments', currentTime, numComments);
            addData('Upvote Percentage', currentTime, upvotePercentage);
            if (derivative !== null) addData('Score Derivative (Score Change Per Second)', currentTime, derivative);

            // Comment Data
            let comments = res[1].data.children;

            if (comments.length !== 0) {
                const firstTopCommentIndex = getTopCommentIndex(comments);
                if (firstTopCommentIndex !== -1) {
                    comments[firstTopCommentIndex].kind = 'used';
                }
                const secondTopCommentIndex = getTopCommentIndex(comments);
                if (secondTopCommentIndex !== -1) {
                    comments[secondTopCommentIndex].kind = 'used';
                }
                const thirdTopCommentIndex = getTopCommentIndex(comments);
                if (thirdTopCommentIndex !== -1) {
                    comments[thirdTopCommentIndex].kind = 'used';
                }

                if (firstTopCommentIndex !== -1) {
                    const commentText = comments[firstTopCommentIndex].data.body;
                    $('#commentOneText').html(createTextPreview(commentText));
                    const commentLink = window.redditURL + 'comment/' + comments[firstTopCommentIndex].data.id;
                    $('#commentOneText').attr('href', commentLink);
                    tippy('#commentOneText', {
                        content: 'Click to view comment on Reddit',
                    });
                    resetText('#commentOneScore', comments[firstTopCommentIndex].data.ups);
                    resetText('#commentOneAwards', comments[firstTopCommentIndex].data.total_awards_received);
                    $('#commentHolderOne').show();
                }

                if (secondTopCommentIndex !== -1) {
                    const commentText = comments[secondTopCommentIndex].data.body
                    $('#commentTwoText').html(createTextPreview(commentText));
                    const commentLink = window.redditURL + 'comment/' + comments[secondTopCommentIndex].data.id;
                    $('#commentTwoText').attr('href', commentLink);
                    tippy('#commentTwoText', {
                        content: 'Click to view comment on Reddit',
                    });
                    resetText('#commentTwoScore', comments[secondTopCommentIndex].data.ups);
                    resetText('#commentTwoAwards', comments[secondTopCommentIndex].data.total_awards_received);
                    $('#commentHolderTwo').show();
                }

                if (thirdTopCommentIndex !== -1) {
                    const commentText = comments[thirdTopCommentIndex].data.body;
                    $('#commentThreeText').html(createTextPreview(commentText));
                    const commentLink = window.redditURL + 'comment/' + comments[thirdTopCommentIndex].data.id;
                    $('#commentThreeText').attr('href', commentLink);
                    tippy('#commentThreeText', {
                        content: 'Click to view comment on Reddit',
                    });
                    resetText('#commentThreeScore', comments[thirdTopCommentIndex].data.ups);
                    resetText('#commentThreeAwards', comments[thirdTopCommentIndex].data.total_awards_received);
                    $('#commentHolderThree').show();
                }
            } else {
                $('#noComments').show();
            }

            $('.column').show();

            window['lastTime'] = new Date().getTime();
            window['lastScore'] = score;
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
const resetText = (selector, newVal, type = 'text') => {
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
        if (Number(newVal) !== NaN) {
            // Is a number
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
                        if (type === 'text') {
                            $(selector).text(newVal);
                        } else if (type === 'html') {
                            $(selector).html(newVal);
                        }
                        $(selector).css('margin-top', '2.2rem');
                        $(selector).animate({ marginTop: '-=2rem' }, 500);
                        return;
                    }
                });
            } else if (isSame) {
                if (type === 'text') {
                    $(selector).text(newVal);
                } else if (type === 'html') {
                    $(selector).html(newVal);
                }
                return;
            } else if (isSmaller) {
                $(selector).css('position', 'absolute');
                $(selector).animate(
                    { marginTop: '+=2rem' }, {
                    complete: () => {
                        if (type === 'text') {
                            $(selector).text(newVal);
                        } else if (type === 'html') {
                            $(selector).html(newVal);
                        }
                        $(selector).css('margin-top', '-1.8rem');
                        $(selector).animate({ marginTop: '+=2rem' }, 500);
                        return;
                    }
                });
            }
        } else {
            $(selector).css('position', 'absolute');
            $(selector).animate(
                { marginTop: '-=2rem' }, {
                complete: () => {
                    if (type === 'text') {
                        $(selector).text(newVal);
                    } else if (type === 'html') {
                        $(selector).html(newVal);
                    }
                    $(selector).css('margin-top', '2.2rem');
                    $(selector).animate({ marginTop: '-=2rem' }, 500);
                    return;
                }
            });
        }
    } else {
        if (type === 'text') {
            $(selector).text(newVal);
        } else if (type === 'html') {
            $(selector).html(newVal);
        }
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
        backgroundColor: '#78800E',
        borderColor: '#78800E',
        lineTension: 0.6,
        data: [],
        hidden: true,
    }, {
        label: 'Upvote Percentage',
        backgroundColor: '#bf37a6',
        borderColor: '#bf37a6',
        lineTension: 0.6,
        data: [],
        hidden: true,
    }, {
        label: 'Score Derivative (Score Change Per Second)',
        backgroundColor: '#ab6733',
        borderColor: '#ab6733',
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
    $('.canvasContainer').parent().removeAttr('id');
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
    $('.canvasContainer').parent().attr('id', 'fullscreen');
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
    window['lastTime'] = null;
    if (url !== '') {
        if (redditRegex.test(url)) {
            // url = url.match(redditRegex)[0] + '/';
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
        content: 'Deleted by user',
    });

    tippy('.removedIcon', {
        content: 'Removed by the moderators',
    });

    tippy('.adIcon', {
        content: 'Advertisement',
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

    tippy('#percentageIcon', {
        content: 'Upvote Percentage',
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

    tippy('.liveIcon', {
        content: 'Live Score',
    });

    tippy('.commentNumber.one', {
        content: 'Top Comment',
    });

    tippy('.commentNumber.two', {
        content: 'Second Top Comment',
    });

    tippy('.commentNumber.three', {
        content: 'Third Top Comment',
    });

    tippy('#graphHelpIcon', {
        content: 'Click on the items at the top to add or remove them from the graph',
    });
});

const execMode = mode => {
    if (mode === 'dark') {
        // Changing to dark.
        window.darkMode = true;
        document.documentElement.style.setProperty('--themeColor', '#f2f2f2');
        document.documentElement.style.setProperty('--lighterThemeColor', '#e0e0e0');
        document.documentElement.style.setProperty('--backgroundColor', '#1f1f1f');
        document.documentElement.style.setProperty('--columnBackgroundColor', 'rgba(255, 255, 255, 0.02)');
        Chart.defaults.color = '#f2f2f2';
        liveChart.update();
        $('#darkModeToggleIcon').text('light_mode');
        $('#darkModeToggleIcon').css('color', '#efb701');
    } else {
        // Changing to light.
        window.darkMode = false;
        document.documentElement.style.setProperty('--themeColor', '#333333');
        document.documentElement.style.setProperty('--lighterThemeColor', '#4d4d4d');
        document.documentElement.style.setProperty('--backgroundColor', '#f2f2f2');
        document.documentElement.style.setProperty('--columnBackgroundColor', '#f2f2f2');
        Chart.defaults.color = '#333333';
        liveChart.update();
        $('#darkModeToggleIcon').text('dark_mode');
        $('#darkModeToggleIcon').css('color', '#333333');
    }
}

const toggleDarkMode = mode => {
    if (mode === undefined) {
        if (window.darkMode === true) {
            execMode('light');
        } else {
            execMode('dark');
        }
    } else {
        if (mode === 'dark') {
            execMode('dark');
        } else {
            execMode('light');
        }
    }
}

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    toggleDarkMode('dark');
}
