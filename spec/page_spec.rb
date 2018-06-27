require 'support/modal_helper.rb'

describe "page", type: :feature, js: true do
  include ModalHelper

  describe "wizard page navbar" do
    before(:each) {
      visit '/'
      close_modal
    }

    it "has a Download Guide link" do
      expect(find('#navbar ul li:first-child').text).to eq('Download Guide')
    end

  end

  describe "resources page navbar" do
    before(:each) {
      visit '/resources'
      close_modal
    }

    it "has a page title" do
      expect(find('.navbar-brand').text).to eq('Illinois Re-Entry Resources')
    end

    it "has a Download Guide" do
      expect(find('#navbar ul li:first-child').text).to eq('Download Guide')
    end

    it "has an About" do
      expect(find('#navbar ul li:nth-child(2)').text).to eq('About')
    end

    it "has a Resources link" do
      expect(find('#navbar ul li:nth-child(3)').text).to eq('Resources')
    end
  end

  describe "map canvas" do
    before(:each) {
      visit '/resources'
      close_modal
      find('.btnViewMode', match: :first).click
    }

    it "has a resources div" do
      sleep(1)
      expect(page).to have_selector('.resources-count', visible: true)
    end
  end

  describe "disclaimer modal" do
    before(:each) {
      visit '/'
    }

    it "has a disclaimer modal" do
      expect(page).to have_selector('.modal-dialog', visible: true)
    end

    it "hides the modal on click" do
      close_modal
      expect(page).to have_selector('.modal-dialog', visible: false)
    end

    it "doesn't show the modal after it's been hidden" do
      close_modal
      expect(page).to have_selector('.modal-dialog', visible: false)
      visit '/'
      expect(page).to have_selector('.modal-dialog', visible: false)
    end

  end

end
