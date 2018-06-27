module ModalHelper
  def close_modal
    sleep(1)
    if find('.modal-dialog .close-btn', visible: true)
      find('.modal-dialog .close-btn', match: :first).click
    end
    sleep(1)
  end
end