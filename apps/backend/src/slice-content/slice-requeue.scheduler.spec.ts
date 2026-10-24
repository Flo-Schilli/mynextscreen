import { SliceRequeueScheduler } from './slice-requeue.scheduler';
import type { SliceEnqueueService } from './slice-enqueue.service';

describe('SliceRequeueScheduler', () => {
  it('re-queues stuck slice jobs on every tick', async () => {
    // Arrange
    const requeueStale = jest.fn().mockResolvedValue(2);
    const scheduler = new SliceRequeueScheduler({ requeueStale } as unknown as SliceEnqueueService);

    // Act
    await scheduler.tick();

    // Assert
    expect(requeueStale).toHaveBeenCalledWith(expect.any(Date));
  });

  it('survives a failing tick', async () => {
    // Arrange
    const requeueStale = jest.fn().mockRejectedValue(new Error('redis down'));
    const scheduler = new SliceRequeueScheduler({ requeueStale } as unknown as SliceEnqueueService);

    // Act / Assert
    await expect(scheduler.tick()).resolves.toBeUndefined();
  });
});
