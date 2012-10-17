function loadTOC() {
    var mc = document.getElementById("mainbox");
    mc.innerHTML += "<h1> Test </h1>";
    var rn = JSONRequest.get(
            "file:///home/miyako/projects/timskinner.net/sections",
            function (requestNum, val, ex) {
                if(val) {
                    mc.innerHTML += val;
                }
                else {
                    mc.innerHTML += "Error";
                }
            }
            );
    mc.innerHTML += "<p>" + "serial num: " + rn;
    mc.innerHTML += "done";
}

function main() {
    loadTOC();
}
