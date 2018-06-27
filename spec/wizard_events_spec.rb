require 'support/modal_helper.rb'

describe "events", type: :feature, js: true do
  include ModalHelper
  let(:address) { '441 North Milwaukee Avenue, Chicago, IL, United States' }

  describe "wizard page" do
    before(:each) {
      visit '/'
      close_modal
    }

    it "shows the first step of the wizard" do
      expect(page).to have_selector("#wizard .step", visible: true)
    end

    it "updates the address parameter for step" do
      uri = URI.parse(current_url)
      expect("#{uri.path}##{uri.fragment}").to eq("/#/?step=1")
    end

    it "displays the current step progress" do
      progress_el = find(:css, ".progress-line")
      expect(progress_el.native.style("width").to_i).to be > 0
    end

    it "updates the step on clicking the .next-btn" do
      find(".next-btn", match: :first).click
      uri = URI.parse(current_url)
      expect("#{uri.path}##{uri.fragment}").to eq("/#/?step=2")
      expect(page).to have_selector("#wizard .step[data-step='1']", visible: true)
    end

    it "updates .results-link href values on input change" do
      find("label.control", match: :first).click
      sleep(1)
      expect(find(".resources-link", match: :first)[:href]).to have_content("/resources/#/?type=housing&")
    end

    it "updates the address parameter when input is filled" do
      find(".next-btn", match: :first).click
      fill_in 'search-address', :with => address
      find(".next-btn", match: :first).click
      sleep(1)
      expect(find(".resources-link", match: :first)[:href]).to have_content(address.split(" ")[0])
    end
  end

end
