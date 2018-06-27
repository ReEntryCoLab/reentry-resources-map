require 'support/modal_helper.rb'

module SearchHelper
  include ModalHelper

  def do_search(address)
    visit '/resources'
    close_modal
    expect(page).to have_selector('.btnViewMode')
    fill_in 'search-address', :with => address
    find("#btnSearch", match: :first).click
  end
end