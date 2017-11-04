require 'support/search_helper.rb'

describe "events", type: :feature, js: true do
  include SearchHelper
  let(:address) { '441 North Milwaukee Avenue, Chicago, IL, United States' }

  describe "click search button" do
    it 'shows a map' do
      do_search(address)
      find('.seeMap', match: :first).click
      expect(page).to have_selector('#mapCanvas', visible: true)
    end

    it 'adds a pushpin' do
      do_search(address)
      find('.seeMap', match: :first).click
      sleep(1)
      expect(page).to have_xpath('//img[@src="/img/blue-pushpin.png"]')
    end

    it 'updates the resources' do
      do_search(address)
      sleep(1)
      find('.seeMap', match: :first).click
      expect(find('.resources-count').text).to end_with 'locations found'
    end

    it 'updates the info div' do
      do_search(address)
      sleep(1)
      find('.seeMap', match: :first).click
      expect(find('.info').text).to eq('Hover over a location')
    end
  end

  describe "click mode view button" do
    it 'shows a list' do
      do_search(address)
      expect(page).to have_selector('#listCanvas', visible: true)
    end

    it 'shows result count' do
      visit '/resources'
      expect(find('#search-header h4').text).to end_with 'resources in Illinois for all categories'
    end
    
    it 'does not show the previous button on the first page' do
      visit '/resources'
      expect(page).to have_selector("#prevButton", visible: false)
      expect(find('#search-header h5').text.split(" ")[1].to_i).to be == 1
    end
    
    it 'shows the next button on the first page' do
      visit '/resources'
      expect(page).to have_selector("#nextButton", visible: true)
    end

    it 'shows filter description' do
      visit '/resources'
      expect(page).to have_selector('.btnViewMode')
      find('#filters label.control', match: :first).click
      find("#btnSearch", match: :first).click
      sleep(1)
      expect(find('#search-header h4').text).to end_with 'resources in Illinois for Housing'
    end
    
    it 'shows page counts' do
      visit '/resources'
      expect(find('#search-header h5').text).to start_with 'Page 1 of'
    end
    
    it 'updates page counts on filter' do
      visit '/resources'
      total_page_count = find('#search-header h4').text.split(" ")[0].to_i
      expect(page).to have_selector('.btnViewMode')
      find('#filters label.control', match: :first).click
      find("#btnSearch", match: :first).click
      sleep(1)
      filtered_page_count = find('#search-header h4').text.split(" ")[0].to_i
      expect(filtered_page_count).to be < total_page_count
    end
    
    it 'updates the current page number on clicking next' do
      visit '/resources'
      expect(find('#search-header h5').text.split(" ")[1].to_i).to be == 1
      find('#nextButton', match: :first).click
      expect(find('#search-header h5').text.split(" ")[1].to_i).to be == 2
    end

    it 'shows filtered address description' do
      do_search(address)
      sleep(1)
      expect(find('#search-header h4').text).to end_with 'resources within 5 miles of 441 North Milwaukee Avenue, Chicago for all categories'
    end
    
    it 'filters for both address and categories' do
      do_search(address)
      sleep(1)
      address_count = find('#search-header h4').text.split(" ")[0].to_i
      find('#filters .control:nth-child(2)', match: :first).click
      find("#btnSearch", match: :first).click
      sleep(1)
      address_category_count = find("#search-header h4").text.split(" ")[0].to_i
      expect(address_category_count).to be < address_count
    end

    it 'filters with multiple categories' do
      visit '/resources'
      expect(page).to have_selector('.btnViewMode')
      find('#filters .control', match: :first).click
      find('#filters .control:nth-child(2)', match: :first).click
      find("#btnSearch", match: :first).click
      sleep(1)
      expect(find('#search-header h4').text).to end_with 'resources in Illinois for Housing, Food'
    end

    it 'show restrictions in description' do
      visit '/resources'
      expect(page).to have_selector('.btnViewMode')
      find('#filters .control:first-child', match: :first).click
      find('#filters .control:last-child', match: :first).click
      find("#btnSearch", match: :first).click
      sleep(1)
      expect(find('#search-header h4').text).to end_with 'resources in Illinois for Housing that serve men'
    end
  end

  # describe "click save search button" do
  #   it "adds an item to nav bar" do
  #     do_search(address)
  #     find("#btnSave", match: :first).click
  #     expect(page).to have_selector('#dropdown-results', visible: true)
  #   end

  #   it "adds a list item to dropdown menu" do
  #     visit '/resources'
  #     sleep(1)
  #     find("#btnSave", match: :first).click
  #     sleep(1)
  #     find(".dropdown-toggle", match: :first).click
  #     searches = Array.new
  #     searches = find('.saved-searches').all('li')
  #     original_list = searches.length
  #     # Do another search with new address.
  #     do_search('432 North Clark Street, Chicago, IL, United States')
  #     find("#btnSave", match: :first).click
  #     find(".dropdown-toggle", match: :first).click
  #     searches_redux = Array.new
  #     searches_redux = find('.saved-searches').all('li')
  #     expect(searches_redux.length - original_list).to eq(1)
  #   end
  # end

  describe "click reset" do
    it "resets the page" do
      do_search(address)
      find("#btnReset", match: :first).click
      uri = URI.parse(current_url)
      expect("#{uri.path}?#{uri.query}").to eq("/resources?")
    end
  end

  describe "save facility" do
    it "adds an element to nav bar" do
      visit '/resources'
      sleep(1)
      find("td.hidden-xs .icon-star-o", match: :first).click
      sleep(1)
      expect(page).to have_selector("#saved-locations", visible: true)
    end

    it "changes the icon to a circle" do
      do_search(address)
      find(".icon-star-o", match: :first).click
      expect(page).to have_selector(".icon-star", visible: true)
    end
  end

  describe "click on list content" do
    it "creates a modal pop-up" do
      visit '/resources'
      sleep(1)
      find('span.facility-name', match: :first).click
      sleep(1)
      expect(page).to have_selector('#modal-pop', visible: true)
    end
  end

end
