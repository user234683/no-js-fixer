// ==UserScript==
// @name     no-js-fixer
// @version  1
// @grant    none
// ==/UserScript==

var d = new Date();
console.log(d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + ":" + d.getMilliseconds());

var dom_css_loaded = false;

function on_DOM_load(fix_site_function){
    return function(){
        if(document.readyState === "loading"){
            window.addEventListener('DOMContentLoaded', fix_site_function);
        } else {
            fix_site_function();
        }
    };
}
function on_DOM_and_CSS_load(fix_site_function){
    return function(){
        if(dom_css_loaded){
            fix_site_function();
        } else {
            window.addEventListener('DOMAndCSSLoaded', fix_site_function);
        }
    };
}
function on_load(fix_site_function){
    return function(){
        if(document.readyState === "loading"){
            window.addEventListener('load', fix_site_function, false);
        } else {
            fix_site_function();
        }
    };
}


// for pages which generate elements with javascript
// observes the page for "a" elements that are added to the page or whose href is changed, and calls the fix_link_function for the specific site
function redirect_fixer(fix_link_function){
    return function(){
        //fix the links on the initial page
        for(var link of document.querySelectorAll('a')) {
            fix_link_function(link);
        }


        //add a callback to fix any links that are added by javascript on the page, or fix links whose href is changed
        var callback = function(mutationsList) {
            for(var mutation_record of mutationsList) {
                if(mutation_record.type === "attributes") {
                    if(mutation_record.target.tagName.toLowerCase() === "a") {
                        fix_link_function(mutation_record.target);
                    }
                } else {
                    for(var added_node of mutation_record.addedNodes) {
                        if(added_node.nodeType === 1) {
                            if(added_node.tagName.toLowerCase() === "a") {
                                fix_link_function(added_node);
                            }
                            for(var link of added_node.querySelectorAll('a')) {
                                fix_link_function(link);
                            }
                        }

                    }
                }
            }
        };

        var config = { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] };
        var observer = new MutationObserver(callback);
        observer.observe(document, config);
    };
}


function stackexchange_sites() {
    var commentContainers = document.querySelectorAll('.comments');
    var element;
    var currentstyle;
    var commentNumber;
    var oReq;
    for (var i = 0, len=commentContainers.length; i < len; i++) {
        element = commentContainers[i];
        // example: comments-36582356
        answerId = element.id.slice(9);
        element = element.querySelector(".js-comments-list");

        function reqListener () {
            this.commentList.innerHTML = this.responseText;
        }

        oReq = new XMLHttpRequest();
        oReq.answerId = answerId;
        oReq.commentList = element;
        oReq.addEventListener("load", reqListener);
        oReq.open("GET", window.location.origin + "/posts/" + answerId + "/comments", true);
        oReq.send();

    }
    /*var commentLinks = document.querySelectorAll('.comments-link');
    for (var i = 0, len=commentLinks.length; i < len; i++) {
        element = commentLinks[i];
        element.parentNode.removeChild(element);
    }*/
}




dispatch = {

"deviantart.com":   // removes redirects
    function(){
        for (var element of document.querySelectorAll('a')) {

            var match = /\/users\/outgoing\?(.+?)$/.exec(element.getAttribute("href") || "");
            if (match != null) {
                element.setAttribute('href', match[1] );
            }

        }
    },

"twitter.com":
    function() {
        // removes redirects
        for (var element of document.querySelectorAll('a')) {
            if (element.hasAttribute("data-expanded-url")) {
                element.setAttribute("href", element.getAttribute("data-expanded-url"));
            } else if (element.hasAttribute("href") && (element.getAttribute("href").indexOf("https://t.co/") == 0) ) {
                element.setAttribute("href", element.getAttribute("title") || element.getAttribute("href"));
            }

        }
        // fix twitter cards
        for(var stupid_iframe of document.querySelectorAll('.js-macaw-cards-iframe-container')){
            var url = stupid_iframe.getAttribute('data-full-card-iframe-url');
            var iframe = document.createElement('iframe');
            iframe.setAttribute('src', url);
            iframe.setAttribute('width', '100%');
            if(stupid_iframe.getAttribute('class').includes('card-type-summary_large_image'))
                iframe.setAttribute('height', '360');

            stupid_iframe.appendChild(iframe);
        }
    },

"youtube.com":      // removes redirects
    redirect_fixer(function(link) {
        var href = link.getAttribute('href') || "";
        if (href.indexOf('/redirect') === 0 ) {
            //console.log(href);
            var matches = /[\?&](url|q)=(.+?)(&|$)/.exec(href);
            //console.log(matches);
            if (matches != null) {
                link.setAttribute('href', unescape(matches[2]) );
            }
        }
    }),


"wikihow.com":      // fixes images and videos
    function(){
        for(var img of document.querySelectorAll('.content-fill[id]')){
            img.style.display = 'initial';
            img.style.position = 'initial';
        }

        for(var vid of document.querySelectorAll('video[data-src]')){
            vid.src = '/video' + vid.getAttribute('data-src');
            vid.setAttribute("controls","");
        }
    },
"ifunny.co":        // fixes videos
    function(){
        var player_template = document.querySelector('template.js-media-template');
        var player_template_parent = player_template.parentElement;
        player_template_parent.innerHTML = player_template.innerHTML;   // can't do this with .replaceChild because template html doesn't have node objects
        player_template_parent.style.display = 'initial';

        var player = player_template_parent.querySelector('video.js-media-player');

        var image_url = player.poster;
        var video_id = /https:\/\/img\.ifcdn\.com\/images\/([a-zA-Z0-9]*)_\d\.jpg/.exec(image_url)[1];
        player.src = "https://img.ifcdn.com/videos/" + video_id + "_1.mp4";
        player.setAttribute("controls","");


        //remove junk that's in the way
        for(var in_the_way of document.querySelectorAll('.media__preview, .media__controls, .media__control')){
            in_the_way.parentElement.removeChild(in_the_way);
        }
    },
"tinypic.com":      // fixes images not being displayed
    function(){
        var img_frame = document.querySelector('#imgFrame');
        img_frame.style.visibility = 'initial';

        var img_element = img_frame.querySelector('#imgElement');
        img_element.style.width = '645px';
    },

"steamcommunity.com":   // removes redirects and fix broken links
    function(){
        // fixes links broken as a result of steam's poor link detection
        var fixLink = function(link) {
            var re = /https?:\/\//;
            // remove extraneous http:// added by steam
            if( link.slice(0,7) === "http://" && /https?:\/\//.test(link.slice(7))) {
                link = link.slice(7);
            }
            if( link[0] === "(") {
                if(link[link.length - 1] === ")") {
                    link = link.slice(1,-1);
                } else {
                    link = link.slice(1);
                }
            }
            return link;
        }

        var elements = document.querySelectorAll('a');
        var element;
        for (var i = 0, len=elements.length; i < len; i++) {
            element = elements[i];
            var match = /\/linkfilter\/\?url=(.+?)$/.exec(element.getAttribute("href") || "");
            if (match != null) {
                element.setAttribute('href', fixLink(match[1]) );
            }
        }
    },

"soundcloud.com":       // removes redirects
    redirect_fixer(function(element) {
        var href = element.getAttribute("href") || "";
        if (href.slice(0,20) === "https://exit.sc?url=") {
            element.setAttribute('href', unescape(href.slice(20)));
        }
    }),

"stackoverflow.com":    stackexchange_sites,    // makes all comments visible
"mathoverflow.com":     stackexchange_sites,
"serverfault.com":      stackexchange_sites,
"superuser.com":        stackexchange_sites,
"stackexchange.com":    stackexchange_sites,
"askubuntu.com":    stackexchange_sites,

"support.hp.com":
    function() {
        var elements = document.body.querySelectorAll('.content, .collapse');
        var element;
        var currentstyle;
        var exclude = ["style", "link", "script"]
        for (var i = 0, len=elements.length+1; i < len; i++) {
                element = elements[i] || document.body;
                if (!exclude.includes(element.tagName.toLowerCase()) ) {
                    if (element.hasAttribute('hidden')) {
                     element.removeAttribute('hidden');
                    }

                    currentstyle = window.getComputedStyle(element);
                    if (("opacity" in currentstyle) && currentstyle.opacity != 1) {
                        element.style.opacity = 1;
                    }
                    if (("display" in currentstyle) && (currentstyle.display == "none")) {
                        element.style.display = "initial";
                    }
                    if (("visibility" in currentstyle) && (currentstyle.visibility == "hidden")) {
                        element.style.visibility = "visible";
                    }
                }
        }
    },

"liveleak.com":
    function() {
        for(var video of document.querySelectorAll('video')) {
            var currentstyle = window.getComputedStyle(video);
            //console.log(currentstyle.height);
            if ("height" in currentstyle) {
                video.style.height = "initial";
            }
            if ("padding-top" in currentstyle) {
                video.style["padding-top"] = "initial";
            }
        }
    },

"flickr.com":   // bypasses "Adult content: you must sign in to view", also makes link to full image
    function() {
        for(var in_the_way of document.querySelectorAll(".photo-notes-scrappy-view, .facade-of-protection-neue ")){
            in_the_way.style.display = "none";
        }
        var img_url = document.querySelector('meta[property="og:image"]').getAttribute("content");
        var restricted = document.querySelector(".view > .restricted-interstitial");

        // "Adult content" example: https://www.flickr.com/photos/danypeschl/5552897815/in/set-72157627261507789/
        if(restricted){
            var height_controller = document.querySelector(".height-controller");
            if(height_controller){
                height_controller.style.height = "initial";
            }

            var view = restricted.parentElement;
            restricted.style.display = "none";
            var img = document.createElement("img");
            img.setAttribute('src', img_url);
            view.appendChild(img);
        // normal page example: https://www.flickr.com/photos/artur_wala/39447177074/
        // add link to full image
        } else {

            // prevent duplicate photo when using noscript-spoofing in umatrix
            var noscript = document.querySelector("img.main-photo.is-hidden ~ noscript");
            noscript.parentElement.removeChild(noscript);

            var img = document.querySelector("img.main-photo.is-hidden");
            img.style.display = "initial";
            if(img){
                var full_link = document.createElement("a");
                full_link.setAttribute('href', img_url);
                img.parentNode.appendChild(full_link);
                full_link.appendChild(img);
            }

        }
    },
"imgur.com":
    function() {
        for(var post_image of document.querySelectorAll(".post-image")){
            var needs_fix = false;
            var image_url;
            var thumbnail_url = null;
            var embed_url = null;
            if(post_image.children.length == 0){  // don't add extraneous images when javascript is enabeld
                var image_id = post_image.parentElement.getAttribute('id');
                image_url = "//i.imgur.com/" + image_id + ".png";
                needs_fix = true;

            } else {
                needs_fix = true;
                // when js disabled, will just be a bunch of meta tags as children
                // this is in the case of videos or gifs
                for(var child of post_image.children){
                    if(child.tagName.toLowerCase() == "meta"){
                        // lowercase because it looks like it's Url sometimes, URL other times
                        switch(child.getAttribute("itemprop").toLowerCase()){
                            case "contenturl":
                                image_url = child.getAttribute("content");
                                break;
                            case "thumbnailurl":
                                thumbnail_url = child.getAttribute("content");
                                break;
                            case "embedurl":
                                embed_url = child.getAttribute("content");
                                break;
                        }
                    } else {
                        needs_fix = false;
                        break;
                    }
                }
            }

            if(needs_fix){
                var extension = image_url.slice(image_url.lastIndexOf(".")+1);
                if(["webm", "mp4", "gifv"].includes(extension)){
                    var vid = document.createElement('video');
                    vid.setAttribute('src', image_url);
                    vid.setAttribute('controls', '');
                    if(thumbnail_url)
                        vid.setAttribute('poster', thumbnail_url);
                    post_image.appendChild(vid);
                } else {

                    var link_element = document.createElement("a");
                    link_element.setAttribute('href', image_url);
                    link_element.setAttribute("class", "zoom");
                    post_image.appendChild(link_element);


                    var img = document.createElement('img');
                    img.setAttribute('src', image_url);
                    link_element.appendChild(img);
                }
            }
        }

    },
"google.com":
    function() {
        // remove link mangling in search results
        for(var element of document.querySelectorAll('#search a[onmousedown]')){
            element.setAttribute("onmousedown", '');
        }

        // remove link mangling on links in image viewer thingy in google iamges
        for(var element of document.querySelectorAll('a[jsaction][rel=noopener]')){
            element.setAttribute("jsaction", '');
        }


        // remove redirects (only for old-style result page)
        for(var element of document.querySelectorAll('#search h3 > a, #search td > a')){
            if (/^(https?:\/\/(www\.|encrypted\.)?google\.[^\/]*)?\/?url/.test(element.href)) {
                var matches = /[\?&](url|q)=(.+?)(?:&sa=|&ved=)/.exec(element.href);
                if (matches != null) {
                    element.setAttribute('href', unescape(matches[2]) );
                }
            }
        }

        // add links for cached link and similar results
        var result_href;
        var parent_node;
        var result_container;
        var arrow;
        var link_span;
        var dash1;
        var dash2;
        var search_query = (/[\?&]q=(.+?)(&|$)/.exec(window.location.href) || ["",""])[1];

        var replace_with_link_span = function(node_to_replace, result_link) {
            link_span = document.createElement('span');
            dash1 = document.createTextNode(' - ');
            dash2 = document.createTextNode(' - ');
            cached_link = document.createElement('a');
            cached_link.setAttribute('href', 'https://webcache.googleusercontent.com/search?q=cache:' + result_link);
            cached_link.innerHTML = "Cached";

            similar_link = document.createElement('a');
            similar_link.setAttribute('href', '/search?q=related:' + result_link + "+" + search_query);
            similar_link.innerHTML = "Similar";

            link_span.appendChild(dash1);
            link_span.appendChild(cached_link);
            link_span.appendChild(dash2);
            link_span.appendChild(similar_link);

            node_to_replace.parentNode.replaceChild(link_span, node_to_replace);
        }

        // This doesn't capture "rich" results which have a different html
        var resultLinks = document.querySelectorAll('#search a[onmousedown], h3 > a');
        for (var i = 0; i < resultLinks.length; i++) {
            result_href = resultLinks[i].href;
            result_container = resultLinks[i].parentNode.parentNode;
            arrow = result_container.querySelector('a[role=button], div[onclick][aria-haspopup=true]');
            if(arrow != null){
                replace_with_link_span(arrow, result_href);
            }

        }

    },
"washingtonpost.com":
    function() {
        for(var bad_embed of document.querySelectorAll("div[data-youtube-id]")){
            var video_link = document.createElement("a");
            var video_url = "https://youtube.com/watch?v=" + bad_embed.getAttribute('data-youtube-id');
            video_link.setAttribute('href', video_url);
            video_link.innerHTML = video_url;
            bad_embed.appendChild(video_link);
        }
        // prevent the lazy-load fixer from choosing the raw img source
        // the sidebar images are normally 60x60 but come with an attribute which has the huge raw image source
        // in its attempt to find the largest image to set as the src, it chooses that huge raw image
        // but the css doesn't have any height/width rules - it just expects a 60x60 image, so the large image ends up covering the page
        for(var img of document.querySelectorAll("li img[data-raw-src]")){
            img.removeAttribute("data-raw-src");
        }
    },
"qz.com":
    function() {
        // This is necessary because umatrix is getting run after this script
        // The site has a css rule for invisible images. It presumably generates the html for the images with javascript normally.
        // The developers were courteous and just put the ready img tag inside a <noscript> tag, and a css rule inside
        //  the noscript tag to override the invisibility. However, when umatrix changes it to a <span> as part of the noscript spoofing,
        //  the invisibility override rule no longer applies since the selector assumes a noscript tag.
        // Because this script runs before umatrix, it sees noscript elements. The nodes inside noscript elements can't be queried with selectors.
        // Even if they could be, the invisible/blurred images fixer wouldn't do anything because it would
        //  see images that aren't invisible since the invisibility override still applies
        for(var noscript of document.querySelectorAll('noscript')){
            noscript.outerHTML = '<span style="display: inline !important;">' + noscript.innerHTML + '</span>';
        }
    },
}


// Given a domain such as meta.math.stackexchange.com, tries to find the function in the dispatch table by trying in order:
// meta.math.stackexchange.com
// math.stackexchange.com
// stackexchange.com

var dispatch_function;
var domain = window.location.hostname;
while (true) {
    dispatch_function = dispatch[domain];
    if(!dispatch_function){
        dot = domain.indexOf('.');
        if(dot == -1){
            break;
        }
        domain = domain.slice(dot+1);
    } else {
        on_DOM_load(dispatch_function)();
        break;
    }
}


// removes click protection from images and videos intended to prevent saving
on_DOM_and_CSS_load(function(){
    for(var elem of document.querySelectorAll('img, video')){
        var currentstyle = window.getComputedStyle(elem);
        if(('pointer-events' in currentstyle) && (currentstyle['pointer-events'] == 'none')){
            elem.style['pointer-events'] = 'initial';
        }
    }
})();

// fix oversized SVG graphics
on_DOM_load(function(){
    for(var element of document.querySelectorAll('svg:not([width]):not([height])')){
        element.setAttribute('height', '1em');
    }
})();

// remove embed.ly
on_DOM_load(function(){
    var querySelectorAllIncludingFrames = function(element,selector) {
        var results = Array.from(element.querySelectorAll(selector));
        for(var frame of document.querySelectorAll('iframe')) {
            results.concat(Array.from(querySelectorAllIncludingFrames(frame.contentWindow.document.body, selector)));
        }
        return results;

    }
    var src;
    var link_match;
    var image_match;
    var link_url;
    var image_url;
    for(var frame of document.body.querySelectorAll('iframe.embedly-embed')) {
        //console.log(frame);
        src = frame.getAttribute("src") || "";
        //console.log(src);
        link_match = /&url=(.+?)(&|$)/.exec(src);
        image_match = /&image=(.+?)(&|$)/.exec(src);
        if (link_match != null) {
            link_url = unescape(link_match[1]);
        } else {
            link_url = src;
        }
        if (image_match != null) {
            image_url = unescape(image_match[1]);
        } else {
            image_url = "";
        }

        new_link_element = document.createElement("a");
        new_link_element.setAttribute("href", link_url);
        image = document.createElement("img");
        image.setAttribute("src", image_url);
        new_link_element.appendChild(image);
        frame.parentNode.replaceChild(new_link_element, frame);
    }
})();



// fix tumblr sites
// example: https://quantumweekly.com/
on_DOM_load(function(){
    // detect whether it's a tumblr site
    var is_tumblr = false;
    for(var stylesheet of document.querySelectorAll('link[type="text/css"]')){
        var href = stylesheet.getAttribute('href');
        if(href.startsWith('https://assets.tumblr.com')){
            is_tumblr = true;
            break;
        }
    }
    if(!is_tumblr){
        return;
    }


    // fix redirects
    for(var element of document.querySelectorAll('a')){
        var match = /(?:(?:https?:\/\/)?t\.umblr.com)?\/redirect\?z=(.+?)(&|$)/.exec(element.getAttribute("href") || "");
        if(match !== null) {
            element.setAttribute('href', unescape(match[1]));
        }
    }

    // remove opacity from posts
    for(var element of document.querySelectorAll('.index-page.grid #posts article')) {
        element.style.opacity = 1;
    }


})();


// Converts youtube embeds to links

//checks if the frame is a youtube embed, and if it is, replaces it with a link to the video
// TODO: Do more cleaning on the link in cases like this? https://www.youtube.com/watch?v=PUvn5xdmfXU?rel=0&autoplay=0&loop=0&start=&end=
// TODO: Maybe remove styling on the links since it sometimes looks weird with certain websites' styles

on_DOM_load(function(){
    var frame_to_link_if_yt_embed = function(frame) {
        src = frame.getAttribute("src") || "";
        if ( (src.indexOf("youtube.com") !== -1) || (src.indexOf("youtu.be") !== -1) || (src.indexOf("youtube-nocookie.com") !== -1)) {
            watch_url = src.replace("/embed/", "/watch?v=").replace("/v/", "/watch?v=").replace("youtu.be", "www.youtube.com").replace("youtube-nocookie.com", "youtube.com");
            new_link_element = document.createElement("a");
            new_link_element.setAttribute("href", watch_url);
            new_link_element.innerHTML = watch_url;
            frame.parentNode.replaceChild(new_link_element, frame);
        }
    }

    //fix the frames on the initial page
    for(var frame of document.querySelectorAll('iframe, embed')) {
        frame_to_link_if_yt_embed(frame);
    }

    //add a callback to fix any frames that are added by javascript on the page
    var callback = function(mutationsList) {
        var frame;
        var src;
        var watch_url;
        var new_link_element;
        var tag_name;
        for(var mutation_record of mutationsList) {
            if(mutation_record.type === "attributes") {
                // who's stupid idea was it to return tag names in uppercase?
                tag_name = mutation_record.target.tagName.toLowerCase();
                if(tag_name === "iframe" || tag_name === "embed") {
                    frame_to_link_if_yt_embed(mutation_record.target);
                }
            } else {
                for(var added_node of mutation_record.addedNodes) {
                    if(added_node.nodeType === 1) {
                        for(var frame of added_node.querySelectorAll('iframe, embed')) {
                            frame_to_link_if_yt_embed(frame);
                        }
                    }

                }
            }
        }
    };

    var config = { subtree: true, childList: true, attributes: true, attributeFilter: ["src"]  };
    var observer = new MutationObserver(callback);
    observer.observe(document, config);
})();


function make_visible(elem){
    var currentstyle = window.getComputedStyle(elem);
    if (("opacity" in currentstyle) && currentstyle.opacity != 1){
        elem.style.opacity = 1;
    }
    if (("display" in currentstyle)&& currentstyle.display == "none") {
        elem.style.display = "initial";
    }
    if (("visibility" in currentstyle) && currentstyle.visibility == "hidden") {
        elem.style.visibility = "visible";
    }
}

// Fix simple case of sites which make the <html> or <body> tags invisible
// Example:
//    https://live.engadget.com/2018/05/20/tesla-releases-source-code-for-autopilot-and-infotainment-tech/
on_DOM_and_CSS_load(function (){
    make_visible(document.querySelector('html'));
    make_visible(document.querySelector('body'));

})();






// *******************************************************
// **************** Image fixes **************************
// *******************************************************






// common antipattern: invisible or blurred images that are made visible by javascript when scrolled to
// https://www.theatlantic.com/photo/2012/12/chinas-nail-grave-relocated/100425/
// http://www.brokenbrowser.com/revealing-the-content-of-the-address-bar-ie/
// https://www.washingtonpost.com/national/health-science/a-14-year-long-oil-spill-in-the-gulf-of-mexico-verges-on-becoming-one-of-the-worst-in-us-history/2018/10/20/f9a66fd0-9045-11e8-bcd5-9d911c784c38_story.html?noredirect=on
function fix_invisible_images(){
    console.log("fuck javascript");
    for(var img of document.querySelectorAll('img')){
        currentstyle = window.getComputedStyle(img);
        if (("filter" in currentstyle) && currentstyle.filter.includes("blur")) {
            img.style.filter = "none";
        }
        if (("-webkit-filter" in currentstyle) && currentstyle["-webkit-filter"].includes("blur")) {
            img.style["-webkit-filter"] = "none";
        }

        make_visible(img);
    }
}


// Uses heuristics to identify lazy load images
// Finds the attribute which likely contains the real URL

// example sites:
// https://www.howtogeek.com/167533/the-ultimate-guide-to-changing-your-dns-server/
// https://www.popsci.com/building-public-detailed-map-internet
// https://www.quora.com/Why-does-C-has-exclamation-point-for-not-ampersand-for-and-and-vertical-line-for-or
// https://www.theatlantic.com/photo/2012/12/chinas-nail-grave-relocated/100425/

function find_real_url(element, keywords) {
    var last_valid = "";
    for (var attribute of element.attributes) {
        /*(var is_image = false;
        for (var ext of file_extensions) {
            if (attribute.value.includes(ext)){
                is_image = true;
                break;
            }
        }
        if(!is_image){
            continue;
        }*/
        var number_of_keywords = 0;
        for (var keyword of keywords) {
            if (attribute.name.includes(keyword) ){
                number_of_keywords += 1;
                if (number_of_keywords >= 2)
                    break;
            }
        }

        if (number_of_keywords >= 2)
            last_valid = attribute;
    }
    if (last_valid !== "")
        return last_valid.value;
    return '';
}

on_DOM_load(function(){
    // Check if the website has img elements inside noscript elements, which likely means they have a 
    //   no-javascript fallback. If we fix the javascript-only images there will be duplicate
    //   images inside the noscript elements. So don't touch the images if that's the case.

    // We can't simply check if there's at least one case of this (which would be more efficient). On many websites, 
    //   the webdevs don't put in the effort to make the lazy-load images work without javascript. They do
    //   however put the effort to make the tracking work without javascript by putting 1x1 tracking images 
    //   (to sites like facebook, google analytics, sb.scorecardresearch, etc) inside noscript tags. Webdevs are assholes.

    // So we instead count the number of instances of img inside noscript tags (image_in_noscript_count), 
    //   and count the number of instances of img tags in the document that our script thinks are lazy load images
    //   that can be fixed (image_fixes.length). If image_in_noscript_count is at least 80% (arbitary) of the number of 
    //   suspected lazy load images, then we decide the website likely has no-js fallbacks for the lazy load images.
    //   Otherwise we attempt to fix them.

    // examples of sites which have a no-js fallback for lazy load images:
    // https://www.cnn.com/2019/01/28/us/polar-vortex-explained-wxc/

    // Have to count this way because css selectors don't work on elements inside noscript tags
    var image_in_noscript_count = 0;
    for(var noscript of document.querySelectorAll('noscript')){
        if(noscript.innerHTML.includes('<img '))
            image_in_noscript_count++;
    }


    //var image_extensions = ['.jpg', '.png', '.gif', '.bmp'];
    var lazy_image_keywords = ['data', 'lazy', 'src'];

    // array of [element, url], where element is an image element and url is the true url that src should be set to
    var image_fixes = [];
    var url;
    for (var element of document.querySelectorAll('img')) {
        url = find_real_url(element, lazy_image_keywords);
        if(url !== '')
            image_fixes.push([element, url]);
    }

    if(image_fixes.length !==0 && image_in_noscript_count >= 0.8*image_fixes.length)
        return;      // website likely has no-js fallbacks for the lazy load images, don't touch anything

    console.log('fixing images');

    // apply the lazy-load fixes
    for(let image_fix of image_fixes){
        image_fix[0].setAttribute('src', image_fix[1]);
    }

    // now fix all the <source> tags in <picture> tag...
    for (var picture_element of document.querySelectorAll('picture')) {
        for (var source_element of picture_element.querySelectorAll("source")) {
            url = find_real_url(source_element, lazy_image_keywords);
            if(url !== '')
                source_element.setAttribute('srcset', url);
        }

    }

    // We put this here because we don't want to do it if the website has no-js fallbacks for images
    //  as that likely means the webdevs actually tested that the images display without javascript
    on_DOM_and_CSS_load(fix_invisible_images)();

})();


















// -------- Make the custom DOMAndCSSLoaded event ---------
// https://stackoverflow.com/a/52938852/8146866
var dom_css_loaded_event = new Event('DOMAndCSSLoaded');
function setup_stylesheet_check(){
    Promise.all(Array.from(document.querySelectorAll('link[rel="stylesheet"]'), ss => new Promise(resolve => {
        const href = ss.href;
        const fulfill = status => resolve({href, status});
        setTimeout(fulfill, 1000, 'timeout');
        ss.addEventListener('load', () => resolve('load'));
        ss.addEventListener('error', () => resolve('error')); // yes, resolve, because we just want to wait until all stylesheets are done with, errors shouldn't stop us
    }))).then((results) => {
        // results is an array of {href:'some url', status: 'load|error|timeout'}
        // at this point stylesheets have finished loading
        console.log("finished");
        window.dispatchEvent(dom_css_loaded_event);
        dom_css_loaded = true;
    });
}

// incase it's already finished by the time this is run
if(document.readyState === "loading"){
    window.addEventListener('DOMContentLoaded', setup_stylesheet_check);
} else {
    setup_stylesheet_check();
}