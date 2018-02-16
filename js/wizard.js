var WIZARD_STEPS = [
    {
        title: 'Tell us what you’re looking for.',
        step_label: 'What',
        questions: [
            {
                text: 'Thinking of the person for whom you are finding resources, ' +
                    'select all of the options that describe what that person is looking for.',
                sub_text: 'We will filter the list to show you only programs related to what you select.',
                help_text: 'The person is looking for:',
                param: 'type',
                checkbox: [
                    { value: 'housing', text: 'A place to live or immediate shelter' },
                    { value: 'food', text: 'Help with meals or groceries' },
                    { value: 'employment', text: 'Job training or help finding a job' },
                    { value: 'health', text: 'Health services, counseling, or wants help with addiction' },
                    // { value: 'advocacy', text: 'Groups that advocate for incarcerated people' },
                    { value: 'legalassistance', text: 'Legal assistance' }
                ]
            }
        ]
    },
    {
        title: 'Tell us where you\'re looking.',
        step_label: 'Where',
        questions: [
            {
                text: 'Do you want to see resources that are close to a certain address? If so, enter the address below.',
                sub_text: 'For example, we can show you resources that are close to your home.',
                param: 'address',
                address: 'search-address'
            }
        ]
    },
    {
        title: 'Tell us a little more about the person who is looking for resources.',
        step_label: 'Who',
        questions: [
            {
                text: 'Thinking of the person for whom you are finding resources, ' + 
                    'select all of the options below that accurately describe that person. ',
                sub_text: 'We will filter the list to show programs and resources that will apply.',
                help_text: 'This person:',
                param: 'type',
                checkbox: [
                    { value: 'isparent', text: 'Is a parent' },
                    { value: 'veterans', text: 'Is a veteran' },
                    { value: 'immigrant', text: 'Is an immigrant' },
                    { value: 'womenonly', text: 'Is a man' },
                    { value: 'menonly', text: 'Is a woman' }
                ]
            },
            {
                text: 'Is this person currently incarcerated?',
                sub_text: 'We can show you programs that serve incarcerated people and their families.',
                param: 'currentlyincarcerated',
                radio: [
                    { value: 'true', text: 'Yes' },
                    { value: 'false', text: 'No' }
                ]
            }
        ]
    }
];

function updateQueryParams() {
    var urlBase = "/resources/#/?";
    var typeOptions = $.map($(".filter-option:checked"), function(obj, idx) { return obj.value; });
    if (typeOptions.length) urlBase += "type=" + encodeURIComponent(typeOptions.join(",")) + "&";

    var address = $("#search-address").val();
    if (address.length) urlBase += "address=" + encodeURIComponent(address);
    $(".resources-link").attr("href", urlBase);
}

function updateStep(idx) {
    var currentStep = $(".step:visible");
    var newStep = $(".step[data-step='" + idx + "']");
    currentStep.hide();
    newStep.show();
    $(".progress-line").css("width", (((idx + 1) / WIZARD_STEPS.length) * 100) + '%');
    $.address.parameter("step", idx + 1);
}

function stepLabels(steps) {
    var width = (100 / steps.length);
    steps.forEach(function(step, idx) {
        var $stepLabel = $("<div>", { "class": "progress-label" });
        $stepLabel.text(step.step_label);
        $stepLabel.css("width", width.toFixed(2) + "%");
        $stepLabel.css("left", (width * idx).toFixed(2) + "%");
        $(".progress").append($stepLabel);
    });
}

(function() {
    var source = $('#wizard-template').html();
    var template = Handlebars.compile(source);
    var result = template(WIZARD_STEPS);
    $('#wizard').html(result);
    stepLabels(WIZARD_STEPS);
    var addrStep = $.address.parameter("step");
    var currentPageIdx = addrStep ? +addrStep - 1 : 0;
    updateStep(currentPageIdx);
    var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-address'));
    // Add slight delay for autocomplete values
    $("#wizard input").on("change", function() { setTimeout(updateQueryParams, 250); });
})()
