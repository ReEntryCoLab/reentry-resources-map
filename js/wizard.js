var WIZARD_STEPS = [
    {
        title: 'Tell us what you’re looking for.',
        questions: [
            {
                text: 'Thinking of the person for whom you are finding resources, ' +
                    'select all of the options that describe what that person is looking ' +
                    'for. We will filter the list to show you only programs related to what ' +
                    'you select.',
                help_text: 'The person is looking for',
                checked_val: 'true',
                param: 'type',
                checkbox: [
                    { value: 'housing', text: 'A place to live or immediate shelter' },
                    { value: 'food', text: 'Help with meals or groceries' },
                    { value: 'employment', text: 'Job training or help finding a job' },
                    { value: 'health', text: 'Medical services, counseling, or wants help with addiction' },
                    { value: 'advocacy', text: 'Groups that advocate for incarcerated people' },
                    { value: 'legal', text: 'Legal assistance' }
                ]
            },
            {
                text: 'Is this person currently incarcerated?',
                help_text: 'We can show you programs that serve incarcerated people and their families.',
                param: 'currently_incarcerated',
                radio: [
                    { value: 'true', text: 'Yes' },
                    { value: 'false', text: 'No' }
                ]
            }
        ]
    },
    {
        title: 'Tell us where you\'re looking',
        questions: [
            {
                text: 'Do you want to see resources that are close to a certain address? If so, enter it below.',
                help_text: 'For example, we can show you resources that are close to your home.',
                param: 'address',
                address: 'search-address'
            }
        ]
    },
    {
        title: 'Tell us a little more about the person who is looking for resources.',
        questions: [
            {
                text: 'Thinking of the person for whom you are finding resources, ' + 
                    'select all of the options below that accurately describe that person. ' +
                    'We can filter the list to show programs and resources that will apply.',
                help_text: 'This person',
                checked_val: 'null',
                param: 'type',
                checkbox: [
                    { value: 'is_parent', text: 'Is a parent' },
                    { value: 'veterans', text: 'Is a veteran' },
                    { value: 'immigrant', text: 'Is an immigrant' },
                    { value: 'women_only', text: 'Is a man' },
                    { value: 'men_only', text: 'Is a woman' }
                ]
            }
        ]
    }
];

function updateQueryParams() {
    var urlBase = "/results/#/?";
    var typeOptions = $.map($(".filter-option:checked"), function(obj, idx) { return obj.value; });
    if (typeOptions.length) urlBase += "type=" + encodeURIComponent(typeOptions.join(" AND ")) + "&";

    var address = $("#search-address").val();
    if (address.length) urlBase += "address=" + encodeURIComponent(address);

    $(".results-btn a").attr("href", urlBase);
}

function updateStep(idx) {
    var currentStep = $(".step:visible");
    var newStep = $(".step[data-step='" + idx + "']");
    currentStep.hide();
    newStep.show();
    $(".progress-line").css("width", (((idx + 1) / WIZARD_STEPS.length) * 100) + '%');
    $("#progress-indicator").text("Step " + (idx + 1) + "/" + WIZARD_STEPS.length);
    $.address.parameter("step", idx + 1);
}

(function() {
    var source = $('#wizard-template').html();
    var template = Handlebars.compile(source);
    var result = template(WIZARD_STEPS);
    $('#wizard').html(result);
    var addrStep = $.address.parameter("step");
    var currentPageIdx = addrStep ? +addrStep - 1 : 0;
    updateStep(currentPageIdx);
    var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-address'));
    $("#wizard input").on("change", updateQueryParams);
})()